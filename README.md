# Stat Chat AI

AI-powered football match analysis for the 2022 FIFA World Cup Final (Argentina vs France). Ask a
natural-language question about the match and get a written answer plus an auto-generated
visualization (shot map, pass network, momentum chart, or player radar).

Built on StatsBomb Open Data, running entirely on local match data — no live sports API, no network
calls at request time.

## Stack

- **Backend:** Python 3.11+ (tested on 3.14), FastAPI, pandas, OpenAI SDK (`gpt-5`, tool calling)
- **Frontend:** React + Vite + TypeScript, D3 for charts

## Prerequisites

- Python 3.11+
- Node.js 18+
- An OpenAI API key with available credit — get one at [platform.openai.com](https://platform.openai.com)

## Setup

### 1. Match data

The final's event data is already checked into `backend/data/`:

- `matches_43_106.json` — 2022 World Cup match list (used to confirm the final's match ID)
- `events_3869685.json` — all events for the final
- `lineups_3869685.json` — squad lineups + player nicknames

If these are missing, re-fetch them from the [StatsBomb open-data](https://github.com/statsbomb/open-data)
repo:

```bash
curl -o backend/data/matches_43_106.json https://raw.githubusercontent.com/statsbomb/open-data/master/data/matches/43/106.json
curl -o backend/data/events_3869685.json  https://raw.githubusercontent.com/statsbomb/open-data/master/data/events/3869685.json
curl -o backend/data/lineups_3869685.json https://raw.githubusercontent.com/statsbomb/open-data/master/data/lineups/3869685.json
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then paste your OPENAI_API_KEY into .env
uvicorn app.main:app --reload --port 8000
```

Or just run `./run-backend.sh` from the repo root (creates the venv and installs deps automatically —
you still need to add your key to `backend/.env` first).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Or `./run-frontend.sh` from the repo root.

Open **http://localhost:5173**. The backend must be running on **:8000** (CORS is pre-configured for
the Vite dev origin).

## How it works

- On startup, the backend parses the selected match's events (the 2022 final by default) into an
  in-memory pandas DataFrame — no database, no re-parsing per request.
- On page load (and after switching match) the shot map is built **without an OpenAI call** via
  `GET /default-viz` — the LLM only runs for questions you actually type.
- `POST /ask` sends your question + 6 tool schemas (`get_shots`, `chances_created`, `player_summary`,
  `team_xg`, `pass_network`, `momentum`) to GPT-5 via OpenAI's function-calling API. The model picks a
  tool, the backend runs it locally against the DataFrame, and the result is fed back for a final
  pundit-style answer.
- The tool that ran determines the visualization: `get_shots` → shot map, `pass_network` → pass
  network, `momentum` → momentum chart, `player_summary` → player radar. Questions with no clear data
  angle (e.g. "narrate the match") get a plain written answer with no chart.
- Repeated questions are answered from a per-match cache persisted to `backend/data/answer_cache.json`,
  so the same question on the same match never costs a second LLM call — even across restarts.
- **Browse games** (header button) lists every game available in StatsBomb open data, grouped by
  competition (World Cup, Champions League, …) with seasons ordered by year. `GET /games` serves the
  competition catalog and `GET /games/{competition_id}/{season_id}` the games for one season; both
  fetch from the open-data repo on first use and cache the JSON in `backend/data/`, falling back to
  the cached files when offline.
- **Clicking a game switches the app to it**: `POST /select-match` downloads (and caches) that
  match's events + lineups, swaps the in-memory store, and the frontend resets the chat, header, and
  visualization for the new match. Suggested questions and the LLM system prompt adapt to the loaded
  teams.

## Project structure

```
backend/
  app/
    main.py         FastAPI app: /match, /select-match, /default-viz, /ask, /games; persistent answer cache
    games.py        Catalog of available games (StatsBomb open data, cached locally)
    llm.py          Tool schemas, OpenAI tool-calling loop, LLM-free default response
    tools.py        Tool implementations (pandas queries over the match events)
    data_loader.py  MatchStore: fetches/caches a match's JSON and parses it into a DataFrame
    config.py       Match/competition IDs, model name, paths
  data/             Local StatsBomb JSON (events, lineups, matches)
frontend/
  src/
    App.tsx                 Top-level state, match switching, loads the LLM-free default viz
    api.ts, types.ts         Backend client + shared types
    components/
      Header.tsx             Match header bar + Browse games button
      GamesBrowser.tsx        Drawer listing available games by competition/season; click to switch
      ChatPanel.tsx           Chat thread + suggested questions + input
      VizCanvas.tsx           Picks the right chart for the current visualization type
      ShotMap.tsx             Half-pitch shot map (SVG)
      PassNetwork.tsx         Pass network (SVG)
      Momentum.tsx            Momentum line/area chart (D3 scales)
      PlayerRadar.tsx         Player radar chart (SVG)
      StatsCards.tsx          Metric cards row
```
