"""Tool functions the LLM can call, operating on the in-memory events DataFrame."""

from collections import Counter, defaultdict

from .data_loader import MatchStore


def _round(v, digits=2):
    if v is None:
        return None
    return round(float(v), digits)


def _match_player(name_col, needle):
    return name_col.str.lower().str.contains(needle.lower(), na=False)


def get_shots(store: MatchStore, team: str | None = None, player: str | None = None, half: int | None = None):
    df = store.events
    shots = df[df["type"] == "Shot"]

    if team:
        shots = shots[shots["team"].str.lower() == team.lower()]
    if player:
        shots = shots[_match_player(shots["player"], player)]
    if half:
        shots = shots[shots["period"] == half]

    results = []
    for _, row in shots.iterrows():
        shot = row["raw"].get("shot", {})
        outcome_name = shot.get("outcome", {}).get("name", "")
        if outcome_name == "Goal":
            outcome = "goal"
        elif outcome_name == "Saved":
            outcome = "saved"
        else:
            outcome = "off_t"

        results.append(
            {
                "player": row["player"],
                "team": row["team"],
                "minute": row["minute"],
                "x": _round(row["x"], 1),
                "y": _round(row["y"], 1),
                "xg": _round(shot.get("statsbomb_xg"), 3),
                "outcome": outcome,
                "outcome_detail": outcome_name,
                "body_part": shot.get("body_part", {}).get("name"),
                "technique": shot.get("technique", {}).get("name"),
            }
        )

    return results


def chances_created(store: MatchStore, player: str | None = None):
    df = store.events
    shots_by_id = {row["id"]: row for _, row in df[df["type"] == "Shot"].iterrows()}

    passes = df[df["type"] == "Pass"]
    if player:
        passes = passes[_match_player(passes["player"], player)]

    results = []
    for _, row in passes.iterrows():
        pass_info = row["raw"].get("pass", {})
        if not pass_info.get("shot_assist") and not pass_info.get("goal_assist"):
            continue

        assisted_shot = shots_by_id.get(pass_info.get("assisted_shot_id"))
        shot_info = assisted_shot["raw"].get("shot", {}) if assisted_shot is not None else {}

        results.append(
            {
                "player": row["player"],
                "team": row["team"],
                "minute": row["minute"],
                "recipient": pass_info.get("recipient", {}).get("name"),
                "xg_assisted": _round(shot_info.get("statsbomb_xg"), 3),
                "led_to_goal": bool(pass_info.get("goal_assist")),
            }
        )

    results.sort(key=lambda r: r["xg_assisted"] or 0, reverse=True)
    return results


def player_summary(store: MatchStore, player: str):
    df = store.events
    mine = df[_match_player(df["player"], player)]

    if mine.empty:
        return {"player": player, "found": False}

    resolved_name = store.short_name(mine["player"].mode().iloc[0])
    team = mine["team"].mode().iloc[0]
    position = mine["position"].mode().iloc[0] if mine["position"].notna().any() else None

    passes = mine[mine["type"] == "Pass"]
    completed_passes = passes[passes["raw"].apply(lambda r: "outcome" not in r.get("pass", {}))]

    shots = mine[mine["type"] == "Shot"]
    shot_xgs = [s["raw"].get("shot", {}).get("statsbomb_xg", 0) for _, s in shots.iterrows()]
    goals = sum(
        1 for _, s in shots.iterrows() if s["raw"].get("shot", {}).get("outcome", {}).get("name") == "Goal"
    )

    key_passes = sum(
        1
        for _, p in passes.iterrows()
        if p["raw"].get("pass", {}).get("shot_assist") or p["raw"].get("pass", {}).get("goal_assist")
    )

    return {
        "player": resolved_name,
        "found": True,
        "team": team,
        "position": position,
        "touches": int(len(mine)),
        "passes_attempted": int(len(passes)),
        "passes_completed": int(len(completed_passes)),
        "pass_accuracy_pct": _round(100 * len(completed_passes) / len(passes), 1) if len(passes) else None,
        "shots": int(len(shots)),
        "goals": int(goals),
        "xg": _round(sum(shot_xgs), 2),
        "key_passes": int(key_passes),
    }


def team_xg(store: MatchStore):
    df = store.events
    shots = df[df["type"] == "Shot"]

    results = []
    for team in store.team_names:
        team_shots = shots[shots["team"] == team]
        xgs = [s["raw"].get("shot", {}).get("statsbomb_xg", 0) for _, s in team_shots.iterrows()]
        goals = sum(
            1
            for _, s in team_shots.iterrows()
            if s["raw"].get("shot", {}).get("outcome", {}).get("name") == "Goal"
        )
        results.append(
            {
                "team": team,
                "shots": int(len(team_shots)),
                "goals": int(goals),
                "total_xg": _round(sum(xgs), 2),
            }
        )
    return results


def pass_network(store: MatchStore, team: str, max_edges: int = 40):
    df = store.events
    passes = df[(df["type"] == "Pass") & (df["team"].str.lower() == team.lower())]

    positions = defaultdict(lambda: [0.0, 0.0, 0])
    edge_counts = Counter()

    for _, row in passes.iterrows():
        pass_info = row["raw"].get("pass", {})
        player = row["player"]
        if player is None or row["x"] is None:
            continue
        player = store.short_name(player)

        pos = positions[player]
        pos[0] += row["x"]
        pos[1] += row["y"]
        pos[2] += 1

        if "outcome" not in pass_info:
            recipient = pass_info.get("recipient", {}).get("name")
            if recipient:
                edge_counts[(player, store.short_name(recipient))] += 1

    nodes = [
        {
            "player": player,
            "x": _round(sx / n, 1),
            "y": _round(sy / n, 1),
            "passes": n,
        }
        for player, (sx, sy, n) in positions.items()
        if n > 0
    ]
    nodes.sort(key=lambda n: n["passes"], reverse=True)

    edges = [
        {"source": src, "target": dst, "count": count}
        for (src, dst), count in edge_counts.most_common(max_edges)
    ]

    return {"team": team, "nodes": nodes, "edges": edges}


def momentum(store: MatchStore, bucket_minutes: int = 5):
    df = store.events

    def bucket_of(minute):
        return (minute // bucket_minutes) * bucket_minutes

    counts = defaultdict(lambda: defaultdict(int))
    max_minute = 0
    for _, row in df.iterrows():
        if row["team"] is None or row["minute"] is None:
            continue
        b = bucket_of(row["minute"])
        counts[b][row["team"]] += 1
        max_minute = max(max_minute, b)

    series = []
    for b in range(0, max_minute + bucket_minutes, bucket_minutes):
        for team in store.team_names:
            series.append({"minute": b, "team": team, "value": counts.get(b, {}).get(team, 0)})

    goal_markers = [
        {
            "minute": row["minute"],
            "team": row["team"],
            "player": row["player"],
        }
        for _, row in df[df["type"] == "Shot"].iterrows()
        if row["raw"].get("shot", {}).get("outcome", {}).get("name") == "Goal"
    ]

    return {"series": series, "goals": goal_markers}
