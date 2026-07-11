"""Catalog of games available in the StatsBomb open-data repo.

Remote JSON is cached to DATA_DIR on first fetch, so repeat requests (and the
match already checked into the repo) never hit the network. If the catalog
can't be fetched and isn't cached, we fall back to whatever matches files are
already on disk.
"""

import json
import logging
import re
from pathlib import Path

import requests

from . import config

logger = logging.getLogger(__name__)


def _read_json(path: Path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _fetch_cached(url: str, path: Path):
    if path.exists():
        logger.debug("Cache hit for %s", path)
        return _read_json(path)
    logger.info("Fetching %s", url)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(resp.content)
    return resp.json()


def _season_year(season_name: str) -> int:
    # Season names are "2022" or "2015/2016" — use the first year for ordering.
    match = re.search(r"\d{4}", season_name or "")
    return int(match.group()) if match else 0


def _season_entry(season_id: int, season_name: str) -> dict:
    return {
        "season_id": season_id,
        "season_name": season_name,
        "year": _season_year(season_name),
    }


def _finalize(groups: dict[int, dict]) -> list[dict]:
    result = sorted(groups.values(), key=lambda g: g["competition_name"].lower())
    for group in result:
        group["seasons"].sort(key=lambda s: s["year"], reverse=True)
    return result


def _local_groups() -> dict[int, dict]:
    """Offline fallback: build the catalog from matches files already on disk."""
    groups: dict[int, dict] = {}
    for path in sorted(config.DATA_DIR.glob("matches_*_*.json")):
        matches = _read_json(path)
        if not matches:
            continue
        comp = matches[0]["competition"]
        season = matches[0]["season"]
        group = groups.setdefault(
            comp["competition_id"],
            {
                "competition_id": comp["competition_id"],
                "competition_name": comp["competition_name"],
                "country_name": comp.get("country_name"),
                "seasons": [],
            },
        )
        group["seasons"].append(_season_entry(season["season_id"], season["season_name"]))
    return groups


def list_groups() -> list[dict]:
    """All available games' competitions, each with its seasons newest-first."""
    try:
        rows = _fetch_cached(
            f"{config.STATSBOMB_BASE_URL}/competitions.json", config.COMPETITIONS_PATH
        )
    except (requests.RequestException, OSError, ValueError):
        logger.warning("Could not fetch competitions catalog, falling back to local data", exc_info=True)
        return _finalize(_local_groups())

    groups: dict[int, dict] = {}
    for row in rows:
        group = groups.setdefault(
            row["competition_id"],
            {
                "competition_id": row["competition_id"],
                "competition_name": row["competition_name"],
                "country_name": row.get("country_name"),
                "seasons": [],
            },
        )
        group["seasons"].append(_season_entry(row["season_id"], row["season_name"]))
    return _finalize(groups)


def list_games(competition_id: int, season_id: int) -> list[dict]:
    """All games for one competition season, ordered by date."""
    path = config.DATA_DIR / f"matches_{competition_id}_{season_id}.json"
    url = f"{config.STATSBOMB_BASE_URL}/matches/{competition_id}/{season_id}.json"
    matches = _fetch_cached(url, path)

    games = [
        {
            "match_id": m["match_id"],
            "match_date": m.get("match_date"),
            "kick_off": m.get("kick_off"),
            "home_team": m["home_team"]["home_team_name"],
            "away_team": m["away_team"]["away_team_name"],
            "home_score": m.get("home_score"),
            "away_score": m.get("away_score"),
            "stage": (m.get("competition_stage") or {}).get("name"),
        }
        for m in matches
    ]
    games.sort(key=lambda g: (g["match_date"] or "", g["kick_off"] or ""))
    return games
