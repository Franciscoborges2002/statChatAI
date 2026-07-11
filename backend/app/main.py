import json

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import config, games, llm
from .data_loader import MatchStore, get_store, set_store

app = FastAPI(title="Tactical Copilot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Answers are cached per match + question and persisted to disk, so a repeated
# question never costs a second LLM call — even across backend restarts.
_CACHE_PATH = config.DATA_DIR / "answer_cache.json"


def _load_answer_cache() -> dict[str, dict]:
    try:
        with open(_CACHE_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


_answer_cache: dict[str, dict] = _load_answer_cache()


def _save_answer_cache():
    try:
        _CACHE_PATH.write_text(json.dumps(_answer_cache), encoding="utf-8")
    except OSError:
        pass


def _normalize_question(question: str) -> str:
    return " ".join(question.strip().lower().split())


def _match_payload(store: MatchStore) -> dict:
    meta = store.meta
    return {
        "match_id": store.match_id,
        "competition": meta["competition"]["competition_name"],
        "season": meta["season"]["season_name"],
        "home_team": meta["home_team"]["home_team_name"],
        "away_team": meta["away_team"]["away_team_name"],
        "home_score": meta["home_score"],
        "away_score": meta["away_score"],
        "match_date": meta["match_date"],
        "stadium": meta.get("stadium", {}).get("name"),
    }


@app.on_event("startup")
def startup():
    get_store()


class AskRequest(BaseModel):
    question: str


class SelectMatchRequest(BaseModel):
    competition_id: int
    season_id: int
    match_id: int


@app.get("/match")
def match():
    return _match_payload(get_store())


@app.post("/select-match")
def select_match(req: SelectMatchRequest):
    try:
        store = set_store(req.competition_id, req.season_id, req.match_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Match not found in that season")
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Match data not found in StatsBomb open data")
        raise HTTPException(status_code=502, detail="Could not fetch match data from StatsBomb open data")
    except requests.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Could not fetch match data from StatsBomb open data — check your network connection",
        )
    return _match_payload(store)


@app.get("/default-viz")
def default_viz():
    return llm.default_response(get_store())


@app.get("/games")
def games_catalog():
    return {"groups": games.list_groups()}


@app.get("/games/{competition_id}/{season_id}")
def season_games(competition_id: int, season_id: int):
    try:
        items = games.list_games(competition_id, season_id)
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 404:
            raise HTTPException(status_code=404, detail="No games found for that season")
        raise HTTPException(status_code=502, detail="Could not fetch games from StatsBomb open data")
    except requests.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Could not fetch games from StatsBomb open data — check your network connection",
        )
    return {"competition_id": competition_id, "season_id": season_id, "games": items}


@app.post("/ask")
def ask(req: AskRequest):
    store = get_store()
    cache_key = f"{store.match_id}::{_normalize_question(req.question)}"
    if cache_key in _answer_cache:
        return _answer_cache[cache_key]

    result = llm.answer_question(store, req.question)
    _answer_cache[cache_key] = result
    _save_answer_cache()
    return result
