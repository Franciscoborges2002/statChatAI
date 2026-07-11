import logging

import pandas as pd

from . import config
from .games import _fetch_cached

logger = logging.getLogger(__name__)


def parse_events(raw_events: list) -> pd.DataFrame:
    rows = []
    for e in raw_events:
        location = e.get("location") or [None, None]
        rows.append(
            {
                "id": e.get("id"),
                "index": e.get("index"),
                "period": e.get("period"),
                "minute": e.get("minute"),
                "second": e.get("second"),
                "timestamp": e.get("timestamp"),
                "type": e.get("type", {}).get("name"),
                "team": e.get("team", {}).get("name"),
                "team_id": e.get("team", {}).get("id"),
                "player": e.get("player", {}).get("name") if e.get("player") else None,
                "player_id": e.get("player", {}).get("id") if e.get("player") else None,
                "position": e.get("position", {}).get("name") if e.get("position") else None,
                "possession": e.get("possession"),
                "possession_team": e.get("possession_team", {}).get("name")
                if e.get("possession_team")
                else None,
                "play_pattern": e.get("play_pattern", {}).get("name")
                if e.get("play_pattern")
                else None,
                "x": location[0],
                "y": location[1],
                "raw": e,
            }
        )

    df = pd.DataFrame(rows)
    return df


def build_nicknames(lineups: dict) -> dict:
    nicknames = {}
    for team in lineups.values():
        for p in team.get("lineup", []):
            nickname = p.get("player_nickname")
            if nickname:
                nicknames[p["player_name"]] = nickname
    return nicknames


class MatchStore:
    """Holds the in-memory dataframe + lineups + metadata for the loaded match.

    Data files are read from DATA_DIR, fetched from the StatsBomb open-data repo
    (and cached) on first use of a match.
    """

    def __init__(self, competition_id: int, season_id: int, match_id: int):
        self.competition_id = competition_id
        self.season_id = season_id
        self.match_id = match_id

        logger.info(
            "Loading match %s (competition=%s season=%s)", match_id, competition_id, season_id
        )
        base = config.STATSBOMB_BASE_URL
        raw_events = _fetch_cached(
            f"{base}/events/{match_id}.json", config.DATA_DIR / f"events_{match_id}.json"
        )
        raw_lineups = _fetch_cached(
            f"{base}/lineups/{match_id}.json", config.DATA_DIR / f"lineups_{match_id}.json"
        )
        matches = _fetch_cached(
            f"{base}/matches/{competition_id}/{season_id}.json",
            config.DATA_DIR / f"matches_{competition_id}_{season_id}.json",
        )

        meta = next((m for m in matches if m["match_id"] == match_id), None)
        if meta is None:
            raise ValueError(f"Match {match_id} not found in season {competition_id}/{season_id}")

        self.events: pd.DataFrame = parse_events(raw_events)
        self.lineups: dict = {team["team_name"]: team for team in raw_lineups}
        self.meta: dict = meta
        self.nicknames: dict = build_nicknames(self.lineups)
        logger.info("Match %s loaded: %d events, %d teams", match_id, len(self.events), len(self.lineups))

    @property
    def team_names(self):
        return [self.meta["home_team"]["home_team_name"], self.meta["away_team"]["away_team_name"]]

    def short_name(self, full_name: str) -> str:
        return self.nicknames.get(full_name, full_name)


store: MatchStore | None = None


def get_store() -> MatchStore:
    global store
    if store is None:
        store = MatchStore(config.COMPETITION_ID, config.SEASON_ID, config.MATCH_ID)
    return store


def set_store(competition_id: int, season_id: int, match_id: int) -> MatchStore:
    """Load a different match and make it the active one.

    The new store is fully built before the swap, so a failed load leaves the
    current match untouched.
    """
    global store
    new_store = MatchStore(competition_id, season_id, match_id)
    store = new_store
    return new_store
