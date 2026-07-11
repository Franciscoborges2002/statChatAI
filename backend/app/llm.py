"""OpenAI tool-calling loop for /ask."""

import json
import logging

from openai import OpenAI

from . import config, tools
from .data_loader import MatchStore

logger = logging.getLogger(__name__)

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_shots",
            "description": "Get all shots taken in the match, optionally filtered by team, player, or half. Use for questions about shots, chances, goals, or xG at the shot level.",
            "parameters": {
                "type": "object",
                "properties": {
                    "team": {"type": "string", "description": "Filter by team name (one of the two teams in the loaded match)"},
                    "player": {"type": "string", "description": "Filter by player name (partial match)"},
                    "half": {"type": "integer", "enum": [1, 2], "description": "1 for first half, 2 for second half"},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "chances_created",
            "description": "Get passes that led to a shot (key passes / assists), optionally filtered by the passing player. Use for 'who created the most chances' style questions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "player": {"type": "string", "description": "Filter by the passing player's name (partial match)"},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "player_summary",
            "description": "Get a summary of one player's match: passes, pass accuracy, shots, goals, xG, key passes, touches, position. Use for 'how did X play' or heatmap-style questions about a single player.",
            "parameters": {
                "type": "object",
                "properties": {
                    "player": {"type": "string", "description": "Player name (partial match), e.g. Messi"},
                },
                "required": ["player"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "team_xg",
            "description": "Get total xG, shot counts, and goals for both teams. Use for 'compare xG by team' style questions.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "pass_network",
            "description": "Get the pass network for one team: average player positions and pass counts between player pairs. Use for pass network / team shape / build-up play questions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "team": {"type": "string", "description": "Team name (one of the two teams in the loaded match)"},
                },
                "required": ["team"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "momentum",
            "description": "Get a time-bucketed series of match involvement per team across the match, for questions about momentum, pressure, or how the game flowed over time.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
]

def system_prompt(store: MatchStore) -> str:
    meta = store.meta
    home, away = store.team_names
    return f"""You are Tactical Copilot, a football (soccer) analysis assistant with a sharp, \
pundit-like tone, embedded in a match-analysis app. The loaded match is {home} vs {away} \
({meta["home_score"]}–{meta["away_score"]}), {meta["competition"]["competition_name"]} \
{meta["season"]["season_name"]}, played on {meta["match_date"]}.

You have tools to query the match's event data. For any question about the match, call exactly ONE \
tool that best matches the question, then write a short, punchy, pundit-style answer (2-4 sentences) \
grounded in the tool's results. Cite concrete numbers (xG, minutes, counts) from the tool output. If the \
question is general commentary/narration with no clear data angle, you may answer without a tool call.

Never call more than one tool for a single question."""


def _run_tool(store: MatchStore, name: str, tool_input: dict):
    if name == "get_shots":
        return tools.get_shots(store, **tool_input)
    if name == "chances_created":
        return tools.chances_created(store, **tool_input)
    if name == "player_summary":
        return tools.player_summary(store, **tool_input)
    if name == "team_xg":
        return tools.team_xg(store)
    if name == "pass_network":
        return tools.pass_network(store, **tool_input)
    if name == "momentum":
        return tools.momentum(store)
    raise ValueError(f"Unknown tool: {name}")


def _visualization_for(tool_name: str, tool_result) -> dict:
    if tool_name == "get_shots":
        return {"type": "shot_map", "title": "Shot map", "data": {"shots": tool_result}}

    if tool_name == "pass_network":
        return {
            "type": "pass_network",
            "title": f"{tool_result['team']} pass network",
            "data": {"team": tool_result["team"], "nodes": tool_result["nodes"], "edges": tool_result["edges"]},
        }

    if tool_name == "momentum":
        return {
            "type": "momentum",
            "title": "Momentum over the match",
            "data": {"series": tool_result["series"], "goals": tool_result["goals"]},
        }

    if tool_name == "player_summary" and tool_result.get("found"):
        r = tool_result
        metrics = [
            {"metric": "Pass accuracy", "value": r["pass_accuracy_pct"] or 0, "max": 100},
            {"metric": "xG", "value": r["xg"] or 0, "max": max(2.0, r["xg"] or 0)},
            {"metric": "Shots", "value": r["shots"], "max": max(10, r["shots"])},
            {"metric": "Key passes", "value": r["key_passes"], "max": max(10, r["key_passes"])},
            {"metric": "Touches", "value": r["touches"], "max": max(150, r["touches"])},
        ]
        return {
            "type": "player_radar",
            "title": f"{r['player']} — match profile",
            "data": {"metrics": metrics},
        }

    return {"type": "none", "title": "", "data": {}}


def _stats_for(tool_name: str, tool_result) -> list[dict]:
    if tool_name == "get_shots":
        goals = sum(1 for s in tool_result if s["outcome"] == "goal")
        total_xg = round(sum(s["xg"] or 0 for s in tool_result), 2)
        return [
            {"label": "Shots", "value": str(len(tool_result))},
            {"label": "Goals", "value": str(goals)},
            {"label": "Total xG", "value": f"{total_xg:.2f}"},
        ]

    if tool_name == "team_xg":
        stats = []
        for row in tool_result:
            stats.append({"label": f"{row['team']} xG", "value": f"{row['total_xg']:.2f}"})
        return stats

    if tool_name == "chances_created":
        top = tool_result[:3]
        return [{"label": c["player"], "value": f"{c['xg_assisted']:.2f} xGA"} for c in top]

    if tool_name == "player_summary" and tool_result.get("found"):
        r = tool_result
        return [
            {"label": "Shots", "value": str(r["shots"])},
            {"label": "Goals", "value": str(r["goals"])},
            {"label": "xG", "value": f"{r['xg']:.2f}"},
            {"label": "Pass acc.", "value": f"{r['pass_accuracy_pct']}%"},
        ]

    if tool_name == "pass_network":
        return [
            {"label": "Players", "value": str(len(tool_result["nodes"]))},
            {"label": "Pass links", "value": str(len(tool_result["edges"]))},
        ]

    return []


def _round_floats(obj):
    if isinstance(obj, float):
        return round(obj, 3)
    if isinstance(obj, dict):
        return {k: _round_floats(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_round_floats(v) for v in obj]
    return obj


def default_response(store: MatchStore) -> dict:
    """Default shot-map response shown on load and after switching match — no LLM call."""
    shots = _round_floats(tools.get_shots(store))

    # Summary counts exclude penalty shootouts (period 5) so they match the official score.
    df = store.events
    in_play = df[(df["type"] == "Shot") & (df["period"] <= 4)]
    parts = []
    for team in store.team_names:
        team_shots = in_play[in_play["team"] == team]
        xg = sum(s["raw"].get("shot", {}).get("statsbomb_xg", 0) for _, s in team_shots.iterrows())
        parts.append(f"{team} {len(team_shots)} shots ({xg:.2f} xG)")

    meta = store.meta
    home, away = store.team_names
    scoreline = f"{home} {meta['home_score']}–{meta['away_score']} {away}"
    return {
        "answer": f"Here's the shot map for {scoreline} — {'; '.join(parts)}. Ask a question to dig deeper.",
        "visualization": _visualization_for("get_shots", shots),
        "stats": _stats_for("get_shots", shots),
    }


def answer_question(store: MatchStore, question: str) -> dict:
    client = OpenAI(api_key=config.OPENAI_API_KEY)

    messages = [
        {"role": "system", "content": system_prompt(store)},
        {"role": "user", "content": question},
    ]
    used_tool_name = None
    used_tool_result = None

    for _ in range(3):
        response = client.chat.completions.create(
            model=config.OPENAI_MODEL,
            messages=messages,
            tools=TOOL_SCHEMAS,
            tool_choice="auto",
        )

        msg = response.choices[0].message

        if not msg.tool_calls:
            answer_text = msg.content or ""
            break

        messages.append(
            {
                "role": "assistant",
                "content": msg.content,
                "tool_calls": [tc.model_dump() for tc in msg.tool_calls],
            }
        )

        for tc in msg.tool_calls:
            tool_input = json.loads(tc.function.arguments) if tc.function.arguments else {}
            logger.info("LLM called tool %s with args %s", tc.function.name, tool_input)
            result = _run_tool(store, tc.function.name, tool_input)
            result = _round_floats(result)
            if used_tool_name is None:
                used_tool_name = tc.function.name
                used_tool_result = result
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result)[:8000],
                }
            )
    else:
        logger.warning("Tool-calling loop exhausted for question: %r", question)
        answer_text = "I ran out of turns trying to answer that — try rephrasing the question."

    visualization = (
        _visualization_for(used_tool_name, used_tool_result)
        if used_tool_name
        else {"type": "none", "title": "", "data": {}}
    )
    stats = _stats_for(used_tool_name, used_tool_result) if used_tool_name else []

    return {"answer": answer_text, "visualization": visualization, "stats": stats}
