# model/model_client.py
"""
Model client module for interacting with the CNN model.
Provides a clean interface for prediction, preprocessing, and model information.
"""

import os
import logging
import numpy as np
from typing import Optional, Tuple, Dict, Any, Union
from dataclasses import dataclass
from PIL import Image
import tensorflow as tf

# Configure logger - quiet mode
logger = logging.getLogger(__name__)
logger.setLevel(logging.WARNING)  # Only show warnings and errors


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class PredictionResult:
    """Result of a digit prediction."""
    digit: int
    confidence: float
    probabilities: np.ndarray
    top_3: list
    success: bool
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "digit": self.digit,
            "confidence": self.confidence,
            "probabilities": self.probabilities.tolist() if self.probabilities is not None else None,
            "top_3": [(int(d), float(c)) for d, c in self.top_3] if self.top_3 else [],
            "success": self.success,
            "error": self.error
        }


@dataclass
class ModelInfo:
    """Information about the loaded model."""
    loaded: bool
    input_shape: Optional[tuple]
    output_shape: Optional[tuple]
    num_params: Optional[int]
    model_path: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "loaded": self.loaded,
            "input_shape": self.input_shape,
            "output_shape": self.output_shape,
            "num_params": self.num_params,
            "model_path": self.model_path
        }


# =============================================================================
# MODEL CLIENT - SINGLETON
# =============================================================================

class ModelClient:
    """
    Singleton client for model operations.
    Provides a clean interface for prediction, preprocessing, and model info.
    
    Notes:
        - All heavy setup (model loading, metadata) happens exactly once, in
          `__new__`, so repeated calls to `ModelClient()` do not reset state
          or re-read the model from disk.
        - `__init__` is a no-op to avoid re-running initialization on the
          singleton instance (Python calls `__init__` on every instantiation).
    """
    
    _instance: Optional['ModelClient'] = None
    _model: Optional[tf.keras.Model] = None
    _model_loaded: bool = False
    _model_path: Optional[str] = None
    _input_shape: Optional[tuple] = None
    _output_shape: Optional[tuple] = None
    _initialized: bool = False
    
    def __new__(cls) -> 'ModelClient':
        if cls._instance is None:
            instance = super(ModelClient, cls).__new__(cls)
            
            # Initialize per-instance attributes ONCE here.
            instance._model = None
            instance._model_loaded = False
            instance._model_path = None
            instance._input_shape = None
            instance._output_shape = None
            instance._initialized = True
            
            # Attempt auto-load only once, at creation time.
            instance._auto_load_model()
            
            cls._instance = instance
        return cls._instance
    
    def __init__(self):
        """
        No-op. All initialization happens in `__new__` so that repeatedly
        calling `ModelClient()` does not reset the singleton's state or
        trigger a model reload.
        """
        pass
    
    # -------------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------------
    
    def _auto_load_model(self) -> None:
        """Attempt to auto-load the model from the default path (once)."""
        if self._model_loaded and self._model is not None:
            return
        
        try:
            from .model_loader import load_model as load_model_fn, is_loaded as is_loaded_fn
            
            # If the underlying loader already has the model cached, reuse it.
            if is_loaded_fn():
                self._model = load_model_fn()
                self._model_loaded = True
                self._update_model_info()
                return
            
            # Otherwise try the default path on disk.
            default_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'model',
                'cnn_model.keras'
            )
            if os.path.exists(default_path):
                self._model = load_model_fn(default_path)
                self._model_loaded = self._model is not None
                if self._model_loaded:
                    self._model_path = default_path
                    self._update_model_info()
        except Exception as e:
            logger.debug(f"Auto-load failed: {e}")
    
    def _update_model_info(self) -> None:
        """Refresh cached model metadata from the loaded model."""
        if self._model is not None:
            try:
                self._input_shape = self._model.input_shape
                self._output_shape = self._model.output_shape
            except Exception as e:
                logger.debug(f"Failed to read model shapes: {e}")
                self._input_shape = None
                self._output_shape = None
    
    # -------------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------------
    
    @classmethod
    def get_instance(cls) -> 'ModelClient':
        """Get (or create) the singleton instance of the client."""
        if cls._instance is None:
            cls._instance = ModelClient()
        return cls._instance
    
    def load_model(self, model_path: Optional[str] = None) -> bool:
        """
        Load the model from the specified path.
        
        Args:
            model_path: Path to the model file. If None, uses the current
                        cached path or the loader's default.
        
        Returns:
            True if the model loaded successfully, False otherwise.
        """
        try:
            from .model_loader import load_model as load_model_fn
            
            if model_path is not None:
                self._model_path = model_path
            
            # Quiet TensorFlow during load.
            tf.get_logger().setLevel(logging.ERROR)
            os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
            
            self._model = load_model_fn(self._model_path)
            self._model_loaded = self._model is not None
            self._update_model_info()
            return self._model_loaded
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self._model_loaded = False
            self._model = None
            return False
    
    def is_loaded(self) -> bool:
        """Return True if a model is currently loaded."""
        return self._model_loaded and self._model is not None
    
    def get_model(self) -> Optional[tf.keras.Model]:
        """Return the underlying Keras model (or None if not loaded)."""
        if not self.is_loaded():
            return None
        return self._model
    
    def get_model_info(self) -> ModelInfo:
        """Return metadata about the loaded model."""
        if not self.is_loaded():
            return ModelInfo(
                loaded=False,
                input_shape=None,
                output_shape=None,
                num_params=None,
                model_path=self._model_path
            )
        
        return ModelInfo(
            loaded=True,
            input_shape=self._input_shape,
            output_shape=self._output_shape,
            num_params=self._model.count_params() if self._model else None,
            model_path=self._model_path
        )
    
    def preprocess(self, image: Union[np.ndarray, Image.Image, str]) -> Optional[np.ndarray]:
        """
        Preprocess an image for model input.
        
        Args:
            image: Image as numpy array, PIL Image, or file path string.
        
        Returns:
            Preprocessed image as (1, 32, 32, 1) numpy array, or None on error.
        """
        try:
            if isinstance(image, str):
                img = Image.open(image)
                image = np.array(img)
            elif isinstance(image, Image.Image):
                image = np.array(image)
            elif not isinstance(image, np.ndarray):
                raise ValueError(f"Unsupported image type: {type(image)}")
            
            # Already batched: (N, 32, 32, 1) or (N, 32, 32, 3)
            if len(image.shape) == 4:
                if image.shape[-1] in (1, 3) and image.shape[1] == 32 and image.shape[2] == 32:
                    return image.astype(np.float32)
            
            # (H, W, C) -> grayscale
            if len(image.shape) == 3:
                if image.shape[2] == 3:
                    image = np.dot(image[..., :3], [0.2989, 0.5870, 0.1140])
                elif image.shape[2] != 1:
                    raise ValueError(f"Image must have 1 or 3 channels, got {image.shape[2]}")
                else:
                    image = image.squeeze(axis=2)
            
            if image.dtype != np.float32:
                image = image.astype(np.float32)
            
            # Normalize if needed.
            if image.max() > 1.0:
                image = image / 255.0
            
            # Resize if needed.
            if image.shape[0] != 32 or image.shape[1] != 32:
                img = Image.fromarray((image * 255).astype(np.uint8))
                img = img.resize((32, 32))
                image = np.array(img, dtype=np.float32) / 255.0
            
            if len(image.shape) != 2:
                raise ValueError(f"Expected 2D image, got shape {image.shape}")
            
            return image.reshape(1, 32, 32, 1)
            
        except Exception as e:
            logger.debug(f"Preprocessing failed: {e}")
            return None
    
    def predict(self, image: Union[np.ndarray, Image.Image, str]) -> PredictionResult:
        """
        Predict the digit from an image.
        
        Args:
            image: Image as numpy array, PIL Image, or file path string.
        
        Returns:
            PredictionResult with prediction details.
        """
        try:
            if not self.is_loaded():
                return PredictionResult(
                    digit=-1,
                    confidence=0.0,
                    probabilities=None,
                    top_3=[],
                    success=False,
                    error="Model not loaded"
                )
            
            processed = self.preprocess(image)
            if processed is None:
                return PredictionResult(
                    digit=-1,
                    confidence=0.0,
                    probabilities=None,
                    top_3=[],
                    success=False,
                    error="Image preprocessing failed"
                )
            
            # Quiet prediction.
            tf.get_logger().setLevel(logging.ERROR)
            predictions = self._model.predict(processed, verbose=0)
            probabilities = predictions[0]
            
            top_indices = np.argsort(probabilities)[::-1][:3]
            top_3 = [(int(i), float(probabilities[i])) for i in top_indices]
            
            predicted_digit = top_3[0][0]
            confidence = top_3[0][1]
            
            return PredictionResult(
                digit=predicted_digit,
                confidence=confidence,
                probabilities=probabilities,
                top_3=top_3,
                success=True,
                error=None
            )
            
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            return PredictionResult(
                digit=-1,
                confidence=0.0,
                probabilities=None,
                top_3=[],
                success=False,
                error=str(e)
            )
    
    def predict_batch(self, images: list) -> list:
        """Predict digits for a list of images."""
        return [self.predict(image) for image in images]


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

_client: Optional[ModelClient] = None


def _get_client() -> ModelClient:
    global _client
    if _client is None:
        _client = ModelClient.get_instance()
    return _client


def load_model(model_path: Optional[str] = None) -> bool:
    return _get_client().load_model(model_path)


def is_loaded() -> bool:
    return _get_client().is_loaded()


def get_model_info() -> ModelInfo:
    return _get_client().get_model_info()


def preprocess(image: Union[np.ndarray, Image.Image, str]) -> Optional[np.ndarray]:
    return _get_client().preprocess(image)


def predict(image: Union[np.ndarray, Image.Image, str]) -> PredictionResult:
    return _get_client().predict(image)


def predict_batch(images: list) -> list:
    return _get_client().predict_batch(images)


# =============================================================================
# FASTAPI DEPENDENCY
# =============================================================================

def get_model_client() -> ModelClient:
    """FastAPI dependency for getting the model client singleton."""
    return ModelClient.get_instance()
