import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

COMPETITION_ID = 43
SEASON_ID = 106
MATCH_ID = 3869685

EVENTS_PATH = DATA_DIR / f"events_{MATCH_ID}.json"
LINEUPS_PATH = DATA_DIR / f"lineups_{MATCH_ID}.json"
MATCHES_PATH = DATA_DIR / f"matches_{COMPETITION_ID}_{SEASON_ID}.json"

STATSBOMB_BASE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"
COMPETITIONS_PATH = DATA_DIR / "competitions.json"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = "gpt-5"

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

PITCH_LENGTH = 120
PITCH_WIDTH = 80
