# app/config.py
"""
Configuration for the OMR Engine API.
Loads settings from environment variables.
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning, module="fitz")

# Load .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


# =============================================================================
# SERVER CONFIGURATION
# =============================================================================

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
API_TITLE = os.getenv("API_TITLE", "OMR Engine API")
API_VERSION = os.getenv("API_VERSION", "1.0.0")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# =============================================================================
# CORS CONFIGURATION
# =============================================================================

CORS_ALLOW_ORIGINS = json.loads(os.getenv("CORS_ALLOW_ORIGINS", '["*"]'))
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]

# =============================================================================
# SUBPROCESS CONFIGURATION
# =============================================================================

SUBPROCESS_TIMEOUT = int(os.getenv("SUBPROCESS_TIMEOUT", "60"))

# =============================================================================
# PROJECT PATHS
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
SHEET_CREATION_SCRIPT = SCRIPTS_DIR / "sheet_creation.py"


def get_script_path() -> Path:
    """Get the path to sheet_creation.py."""
    if not SHEET_CREATION_SCRIPT.exists():
        raise FileNotFoundError(f"Script not found: {SHEET_CREATION_SCRIPT}")
    return SHEET_CREATION_SCRIPT