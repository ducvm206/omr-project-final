# model/model_loader.py
"""
Model loader module for FastAPI application.
Loads the CNN model once at startup and provides access to it.
"""

# -----------------------------------------------------------------------------
# IMPORTANT: TensorFlow env vars MUST be set BEFORE importing tensorflow,
# otherwise they are ignored by TF's C++ runtime.
# -----------------------------------------------------------------------------
import os

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['ABSL_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import logging
from typing import Optional, Tuple

import numpy as np
import tensorflow as tf

# Configure logger - quiet mode
logger = logging.getLogger(__name__)
logger.setLevel(logging.WARNING)  # Only show warnings and errors

# -----------------------------------------------------------------------------
# Protobuf compatibility shim (older TF versions relied on MessageFactory.GetPrototype).
# Scoped and logged so it's discoverable if it actually fires.
# -----------------------------------------------------------------------------
try:
    from google.protobuf import message_factory

    if not hasattr(message_factory.MessageFactory, 'GetPrototype'):
        logger.debug(
            "Applying protobuf MessageFactory.GetPrototype compatibility shim."
        )
        message_factory.MessageFactory.GetPrototype = lambda self, *a, **k: None
except ImportError:
    pass


# =============================================================================
# GLOBAL STATE
# =============================================================================

# Canonical default filename. Keep this in sync with any other module that
# references the default model path (e.g. model_client.py).
DEFAULT_MODEL_FILENAME = 'cnn_model.keras'

_model: Optional[tf.keras.Model] = None
_model_loaded: bool = False
_loaded_path: Optional[str] = None


# =============================================================================
# PATH HELPERS
# =============================================================================

def _default_model_path() -> str:
    """Return the canonical default path to the model file."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    return os.path.join(project_root, 'model', DEFAULT_MODEL_FILENAME)


# =============================================================================
# LOADING / ACCESS
# =============================================================================

def load_model(
    model_path: Optional[str] = None,
    force_reload: bool = False,
) -> tf.keras.Model:
    """
    Load the CNN model from disk.

    This function is idempotent: if the same model has already been loaded
    (and `force_reload` is False), the cached instance is returned without
    re-reading from disk.

    Args:
        model_path: Path to the model file. If None, uses the default path
                    (`<project_root>/model/cnn_model.keras`).
        force_reload: If True, reload the model from disk even if it's already
                      cached.

    Returns:
        Loaded Keras model.

    Raises:
        FileNotFoundError: If the model file doesn't exist.
        Exception: If model loading fails.
    """
    global _model, _model_loaded, _loaded_path

    if model_path is None:
        model_path = _default_model_path()

    # Short-circuit: same path already loaded and no forced reload requested.
    if (
        not force_reload
        and _model_loaded
        and _model is not None
        and _loaded_path == model_path
    ):
        return _model

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")

    try:
        # Quiet TensorFlow during load.
        tf.get_logger().setLevel(logging.ERROR)

        loaded = tf.keras.models.load_model(model_path)

        _model = loaded
        _model_loaded = True
        _loaded_path = model_path

        logger.debug(f"Loaded model from {model_path}")
        return _model

    except Exception as e:
        # Reset cached state so callers can distinguish "load failed" from
        # "previous model still around".
        logger.error(f"Failed to load model from {model_path}: {e}")
        _model = None
        _model_loaded = False
        _loaded_path = None
        raise


def get_model() -> tf.keras.Model:
    """
    Get the loaded model instance.

    Returns:
        Loaded Keras model.

    Raises:
        RuntimeError: If the model hasn't been loaded yet.
    """
    if not is_loaded():
        raise RuntimeError("Model not loaded. Call load_model() first.")
    return _model


def is_loaded() -> bool:
    """Check if the model is currently loaded."""
    return _model_loaded and _model is not None


def get_loaded_path() -> Optional[str]:
    """Return the path the current model was loaded from, if any."""
    return _loaded_path


def unload_model() -> None:
    """Drop the cached model (useful for tests / hot-reload scenarios)."""
    global _model, _model_loaded, _loaded_path
    _model = None
    _model_loaded = False
    _loaded_path = None


# =============================================================================
# PREPROCESSING
# =============================================================================

def preprocess_image(image_array: np.ndarray) -> np.ndarray:
    """
    Preprocess a single image for model prediction.

    Contract:
        - Accepts (32, 32), (32, 32, 1), or (32, 32, 3) arrays.
        - Converts to grayscale if 3-channel.
        - Normalizes to [0, 1] if values exceed 1.0.
        - Returns a (1, 32, 32, 1) float32 array.

    Args:
        image_array: Input image as numpy array.

    Returns:
        Preprocessed image ready for model input: (1, 32, 32, 1).

    Raises:
        ValueError: If the image shape or channel count is unsupported.
    """
    if image_array is None:
        raise ValueError("image_array is None")

    if not isinstance(image_array, np.ndarray):
        image_array = np.asarray(image_array)

    if image_array.shape[:2] != (32, 32):
        raise ValueError(
            f"Image must be 32x32, got {image_array.shape[:2]}"
        )

    # Collapse channels to 2D grayscale.
    if image_array.ndim == 3:
        channels = image_array.shape[2]
        if channels == 3:
            image_array = np.dot(
                image_array[..., :3], [0.2989, 0.5870, 0.1140]
            )
        elif channels == 1:
            image_array = image_array[..., 0]
        else:
            raise ValueError(
                f"Image must have 1 or 3 channels, got {channels}"
            )
    elif image_array.ndim != 2:
        raise ValueError(
            f"Unsupported image shape: {image_array.shape}"
        )

    if image_array.dtype != np.float32:
        image_array = image_array.astype(np.float32)

    if image_array.max() > 1.0:
        image_array = image_array / 255.0

    # Now guaranteed to be 2D (32, 32).
    return image_array.reshape(1, 32, 32, 1)


# =============================================================================
# PREDICTION
# =============================================================================

def predict_digit(image_array: np.ndarray) -> Tuple[int, float, np.ndarray]:
    """
    Predict the digit from a *preprocessed* image.

    Args:
        image_array: Preprocessed image of shape (1, 32, 32, 1).

    Returns:
        Tuple of (predicted_digit, confidence, full_probabilities).
    """
    model = get_model()
    predictions = model.predict(image_array, verbose=0)
    predicted_digit = int(np.argmax(predictions[0]))
    confidence = float(np.max(predictions[0]))
    return predicted_digit, confidence, predictions[0]


def predict_digit_from_image(
    image_array: np.ndarray,
) -> Tuple[int, float, np.ndarray]:
    """
    Predict the digit from a raw image (handles preprocessing).

    Args:
        image_array: Raw image, (32, 32), (32, 32, 1), or (32, 32, 3).

    Returns:
        Tuple of (predicted_digit, confidence, full_probabilities).
    """
    preprocessed = preprocess_image(image_array)
    return predict_digit(preprocessed)


# =============================================================================
# WARMUP
# =============================================================================

def warmup_model() -> bool:
    """
    Run a warmup prediction to ensure the model is ready.

    Returns:
        True if the warmup prediction completed successfully, False otherwise.
    """
    if not is_loaded():
        logger.error("Warmup requested but no model is loaded.")
        return False

    try:
        dummy_image = np.zeros((1, 32, 32, 1), dtype=np.float32)
        predict_digit(dummy_image)
        return True
    except Exception as e:
        logger.error(f"Model warmup failed: {e}")
        return False