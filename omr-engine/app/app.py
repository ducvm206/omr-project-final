# app/app.py
"""
FastAPI application entry point.
Runs the server with all routes from router.
"""

import socket
import warnings
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Suppress Pydantic / deprecation warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

from .router import router
from .config import (
    API_TITLE,
    API_VERSION,
    API_HOST,
    API_PORT,
    CORS_ALLOW_ORIGINS,
    CORS_ALLOW_CREDENTIALS,
    CORS_ALLOW_METHODS,
    CORS_ALLOW_HEADERS,
    DEBUG,
)

# -----------------------------------------------------------------------------
# Imports from the sibling `model` package.
# The project root must be on sys.path (run from project root or via a
# proper package install). No sys.path hack needed here.
# -----------------------------------------------------------------------------
from model.model_loader import (
    load_model as load_model_fn,
    warmup_model,
    is_loaded as loader_is_loaded,
)
from model.model_client import (
    ModelClient,
    is_loaded as client_is_loaded,
    get_model_info,
)


# =============================================================================
# LOGGING
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

# Silence noisy loggers
for noisy in ("tensorflow", "urllib3", "matplotlib", "absl"):
    logging.getLogger(noisy).setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


# =============================================================================
# LIFESPAN
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Load the model at startup, fail fast if it cannot be loaded,
    and warm it up so the first real request is fast.
    """
    logger.info("=" * 60)
    logger.info(f"  {API_TITLE} v{API_VERSION}")
    logger.info("=" * 60)

    # -------------------------------------------------------------------------
    # 1. Load model (using the loader's own default path — single source of
    #    truth for the filename: model/model_loader.DEFAULT_MODEL_FILENAME).
    # -------------------------------------------------------------------------
    try:
        load_model_fn()

        # Instantiate the client so it picks up the already-loaded model.
        client = ModelClient.get_instance()
        if not client.is_loaded():
            raise RuntimeError("ModelClient did not pick up the loaded model")

        info = client.get_model_info()
        logger.info(
            f"  Model: {info.input_shape} → {info.output_shape} "
            f"({info.num_params:,} params)"
        )
        logger.info(f"  Path:  {info.model_path}")

        # Warmup so the first user request doesn't pay the graph-tracing cost.
        if not warmup_model():
            raise RuntimeError("Model warmup failed")
        logger.info("  Warmup: OK")

    except Exception as e:
        # Fail fast — do not start a server that cannot serve predictions.
        logger.error(f"  Model: FAILED ({e})")
        raise RuntimeError(
            f"Cannot start server: model load failed: {e}"
        ) from e

    # -------------------------------------------------------------------------
    # 2. Server info
    # -------------------------------------------------------------------------
    logger.info(f"  Host: {API_HOST}:{API_PORT}")
    logger.info(f"  UI:   http://{API_HOST}:{API_PORT}/ui")
    logger.info(f"  Docs: http://{API_HOST}:{API_PORT}/api/docs")
    logger.info("=" * 60)
    logger.info("  Server ready")
    logger.info("=" * 60)

    yield  # ---- app runs ----

    # -------------------------------------------------------------------------
    # 3. Shutdown
    # -------------------------------------------------------------------------
    logger.info("=" * 60)
    logger.info("  Shutting down...")
    logger.info("=" * 60)


# =============================================================================
# APP
# =============================================================================

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    debug=DEBUG,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=CORS_ALLOW_METHODS,
    allow_headers=CORS_ALLOW_HEADERS,
)

app.include_router(router)


# =============================================================================
# STATIC UI
# =============================================================================

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UI_PATH = os.path.join(PROJECT_ROOT, "ui")

if os.path.exists(UI_PATH):
    app.mount("/ui", StaticFiles(directory=UI_PATH, html=True), name="ui")
else:
    logger.warning(f"UI directory not found: {UI_PATH}")


# =============================================================================
# ROOT ENDPOINT
# =============================================================================

@app.get("/")
async def root():
    """Root endpoint — API information."""
    try:
        info = get_model_info()
        model_info = info.to_dict() if info.loaded else None
    except Exception:
        logger.exception("Failed to get model info in root endpoint")
        model_info = None

    return {
        "service": API_TITLE,
        "version": API_VERSION,
        "model_loaded": client_is_loaded(),
        "model": model_info,
        "ui_url": f"http://localhost:{API_PORT}/ui",
        "endpoints": {
            "create_template": "POST /eg/template",
            "create_manual_exam": "POST /eg/exam/manual",
            "create_extraction_exam": "POST /eg/exam/extraction",
            "grade": "POST /eg/grade",
            "predict": "POST /eg/predict",
            "predict_batch": "POST /eg/predict/batch",
            "model_info": "GET /eg/model-info",
            "model_status": "GET /eg/model-status",
            "requests": "GET /eg/requests",
            "logs": "GET /eg/logs",
            "health": "GET /eg/health",
            "ping": "GET /eg/ping",
            "websocket": "WS /eg/ws",
            "docs": "GET /api/docs",
            "redoc": "GET /api/redoc",
            "ui": "GET /ui",
        },
    }


# =============================================================================
# HELPERS
# =============================================================================

def get_local_ip() -> str:
    """Return the local IP address of this machine."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


# =============================================================================
# RUN SERVER (dev entry point)
# =============================================================================

if __name__ == "__main__":
    import uvicorn

    host = API_HOST
    port = API_PORT

    if host == "0.0.0.0":
        local_ip = get_local_ip()
        display_urls = [
            f"http://localhost:{port}",
            f"http://127.0.0.1:{port}",
            f"http://{local_ip}:{port}",
        ]
        display_host = "0.0.0.0 (all interfaces)"
    else:
        display_urls = [f"http://{host}:{port}"]
        display_host = host

    # Single startup banner (the lifespan banner will follow once the server
    # actually begins its startup sequence).
    print("=" * 60)
    print(f"  Starting {API_TITLE} v{API_VERSION}")
    print("=" * 60)
    print(f"  Host: {display_host}")
    print(f"  Port: {port}")
    print("-" * 60)
    print("  URLs:")
    for url in display_urls:
        print(f"    {url}")
    print("-" * 60)
    print(f"  UI:   {display_urls[0]}/ui")
    print(f"  Docs: {display_urls[0]}/api/docs")
    print("=" * 60)
    print("  Press Ctrl+C to stop")
    print("=" * 60)

    uvicorn.run(
        "app.app:app",
        host=host,
        port=port,
        reload=DEBUG,
    )