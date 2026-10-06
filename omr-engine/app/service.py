# app/service.py
"""
Service layer - Handles business logic, subprocess execution, JSON parsing,
image preprocessing, and model introspection.
"""

import os
import sys
import json
import time
import subprocess
import tempfile
import io
import logging
from typing import Tuple, Optional, Dict, Any, List
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image

from .config import get_script_path, SUBPROCESS_TIMEOUT


logger = logging.getLogger(__name__)


# =============================================================================
# STEP TIMER
# =============================================================================

class StepTimer:
    """
    Lightweight context-manager timer that collects named step durations.

    Usage:
        timer = StepTimer()
        with timer.step("load_image"):
            ...
        with timer.step("run_model"):
            ...
        timer.report()   # logs all steps
        timer.durations  # dict: {"load_image": 0.012, "run_model": 0.834}
    """

    def __init__(self, log: Optional[logging.Logger] = None, prefix: str = ""):
        self._log = log or logger
        self._prefix = prefix
        self.durations: Dict[str, float] = {}
        self._order: List[str] = []
        self._start: Optional[float] = None

    class _Step:
        def __init__(self, timer: "StepTimer", name: str):
            self.timer = timer
            self.name = name
            self.t0 = 0.0

        def __enter__(self):
            self.t0 = time.perf_counter()
            return self

        def __exit__(self, exc_type, exc, tb):
            elapsed = time.perf_counter() - self.t0
            self.timer.durations[self.name] = self.timer.durations.get(self.name, 0.0) + elapsed
            if self.name not in self.timer._order:
                self.timer._order.append(self.name)
            status = "FAILED" if exc_type else "OK"
            self.timer._log.info(
                f"{self.timer._prefix}[{self.name}] {status} in {elapsed * 1000:.1f} ms"
            )
            return False  # don't suppress exceptions

    def step(self, name: str) -> "StepTimer._Step":
        return self._Step(self, name)

    def start(self) -> None:
        self._start = time.perf_counter()

    def total(self) -> float:
        if self._start is None:
            return sum(self.durations.values())
        return time.perf_counter() - self._start

    def report(self) -> None:
        if not self.durations:
            return
        total = self.total()
        parts = ", ".join(
            f"{name}={self.durations[name] * 1000:.1f}ms"
            for name in self._order
        )
        self._log.info(
            f"{self._prefix}TOTAL {total * 1000:.1f} ms  ({parts})"
        )


# =============================================================================
# SERVICE
# =============================================================================

class OMREngineService:
    """Service class for OMR engine operations."""

    def __init__(self):
        try:
            self.script_path = get_script_path()
            self.python_executable = sys.executable
            self.project_root = Path(__file__).parent.parent
        except FileNotFoundError as e:
            raise RuntimeError(f"Sheet creation script not found: {e}")

    # ==================================================================
    # PATH HELPERS
    # ==================================================================

    def get_exam_script_path(self) -> Path:
        """Get the path to exam_creation.py."""
        return self.project_root / "scripts" / "exam_creation.py"

    def get_grading_script_path(self) -> Path:
        """Get the path to grading.py."""
        return self.project_root / "scripts" / "grading.py"

    # ==================================================================
    # SUBPROCESS HELPERS
    # ==================================================================

    def run_sheet_creation(self, args: list) -> Tuple[bool, str, str]:
        """Run sheet_creation.py as a subprocess."""
        cmd = [self.python_executable, str(self.script_path)] + args

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=SUBPROCESS_TIMEOUT,
            )
            return result.returncode == 0, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return False, "", f"Process timed out after {SUBPROCESS_TIMEOUT} seconds"
        except Exception as e:
            return False, "", str(e)

    def _run_script_with_json(
        self,
        script_path: Path,
        input_data: dict,
        timeout: int,
        *,
        timer: Optional[StepTimer] = None,
        label: str = "script",
    ) -> Tuple[bool, Optional[dict], Optional[str]]:
        """
        Run a script by passing JSON via stdin and parsing JSON from stdout.

        Returns:
            (success, parsed_output_or_None, error_message_or_None)

        Side effect:
            If `timer` is provided, records these steps into it:
              - f"{label}.serialize"
              - f"{label}.subprocess"
              - f"{label}.parse"
        """
        if not script_path.exists():
            return False, None, f"Script not found: {script_path}"

        own_timer = timer is None
        timer = timer or StepTimer(prefix=f"[{label}] ")

        # ---- 1. Serialize input ------------------------------------------
        try:
            with timer.step(f"{label}.serialize"):
                json_input = json.dumps(input_data)
        except Exception as e:
            return False, None, f"Failed to serialize input: {e}"

        # ---- 2. Run subprocess -------------------------------------------
        try:
            with timer.step(f"{label}.subprocess"):
                result = subprocess.run(
                    [self.python_executable, str(script_path)],
                    input=json_input,
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                )
        except subprocess.TimeoutExpired:
            return False, None, f"Script timed out after {timeout} seconds"
        except Exception as e:
            return False, None, str(e)

        if result.returncode != 0:
            return False, None, f"Script failed: {result.stderr}"

        # ---- 3. Parse output ---------------------------------------------
        try:
            with timer.step(f"{label}.parse"):
                output = json.loads(result.stdout)
        except json.JSONDecodeError as e:
            return False, None, f"Failed to parse script output: {e}"

        if own_timer:
            timer.report()

        return True, output, None

    # ==================================================================
    # EXAM CREATION
    # ==================================================================

    def run_exam_creation(
        self, input_data: dict
    ) -> Tuple[bool, Optional[dict], Optional[str]]:
        """Run exam_creation.py with the given input data."""
        timer = StepTimer(prefix="[exam_creation] ")
        timer.start()
        try:
            return self._run_script_with_json(
                self.get_exam_script_path(),
                input_data,
                timeout=60,
                timer=timer,
                label="exam_creation",
            )
        finally:
            timer.report()

    # ==================================================================
    # GRADING
    # ==================================================================

    def run_grading(self, config_dict: dict) -> Tuple[bool, Optional[dict], Optional[str]]:
        """
        Run grading in-process using the API's already-loaded model.

        Returns:
            (success, result_or_None, error_or_None)

            On success, `result` is `{"success": True, "data": {...}}` so the
            router can uniformly do result.get("data") / result.get("success").
        """
        timer = StepTimer(prefix="[grading] ")
        timer.start()

        try:
            with timer.step("grading.import"):
                from scripts.grading import grade_from_dict
                from model.model_client import ModelClient

            with timer.step("grading.get_client"):
                client = ModelClient.get_instance()  # already warm from startup

            with timer.step("grading.run"):
                success, error, result = grade_from_dict(
                    config_dict,
                    model_client=client,
                    enable_annotation=True,
                )

            if not success:
                return False, None, error or "Grading failed (no error message)"

            # Normalize into the same envelope the subprocess path used to
            # produce via grading.py's stdout: {"success": True, "data": {...}}
            return True, {"success": True, "data": result}, None

        except Exception as e:
            logger.exception("run_grading failed")
            return False, None, f"{type(e).__name__}: {e}"

        finally:
            timer.report()

    # ==================================================================
    # IMAGE PREPROCESSING (for model input)
    # ==================================================================

    @staticmethod
    def preprocess_image(contents: bytes) -> np.ndarray:
        """
        Convert raw image bytes into a normalized (1, 32, 32, 1) float32 array
        suitable for the digit-recognition model.
        """
        timer = StepTimer(prefix="[preprocess] ")
        timer.start()

        try:
            with timer.step("preprocess.open"):
                image = Image.open(io.BytesIO(contents))

            with timer.step("preprocess.convert_L"):
                if image.mode != "L":
                    image = image.convert("L")

            with timer.step("preprocess.resize"):
                image = image.resize((32, 32))

            with timer.step("preprocess.to_array"):
                arr = np.array(image, dtype=np.float32)
                if arr.max() > 1.0:
                    arr = arr / 255.0

            with timer.step("preprocess.reshape"):
                out = arr.reshape(1, 32, 32, 1)

            return out
        finally:
            timer.report()

    # ==================================================================
    # MODEL INFO / STATUS
    # ==================================================================

    def get_model_info(self) -> Dict[str, Any]:
        """Return structured model information."""
        try:
            from model.model_client import get_model_info, is_loaded
        except ImportError:
            return {"loaded": False, "error": "ModelClient not available"}

        try:
            if not is_loaded():
                return {
                    "loaded": False,
                    "input_shape": None,
                    "output_shape": None,
                    "num_params": None,
                    "model_path": None,
                    "loaded_at": None,
                }

            info = get_model_info()
            return {
                "loaded": info.loaded,
                "input_shape": info.input_shape,
                "output_shape": info.output_shape,
                "num_params": info.num_params,
                "model_path": info.model_path,
                "loaded_at": datetime.now().isoformat() if info.loaded else None,
            }
        except Exception as e:
            return {"loaded": False, "error": str(e)}

    def get_model_status(self) -> Dict[str, Any]:
        """Return simple model status."""
        try:
            from model.model_client import is_loaded

            return {
                "loaded": is_loaded(),
                "timestamp": datetime.now().isoformat(),
            }
        except ImportError:
            return {
                "loaded": False,
                "error": "ModelClient not available",
                "timestamp": datetime.now().isoformat(),
            }

    # ==================================================================
    # OUTPUT PARSING (for sheet_creation.py)
    # ==================================================================

    def parse_output(self, stdout: str) -> Dict[str, Any]:
        """Parse the JSON output from sheet_creation.py."""
        if not stdout or stdout.strip() == "":
            return {"error": "No output received from script"}

        try:
            lines = stdout.strip().split("\n")

            json_start = -1
            for i, line in enumerate(lines):
                if line.strip().startswith("{"):
                    json_start = i
                    break

            if json_start == -1:
                return {"error": "No JSON found in output", "raw_output": stdout}

            json_text = "\n".join(lines[json_start:])
            return json.loads(json_text)

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse failed: {e}")
            return {"error": f"Failed to parse JSON: {e}", "raw_output": stdout}

    # ==================================================================
    # TEMPLATE CREATION
    # ==================================================================

    def create_template(
        self,
        name: str = "Untitled Sheet",
        mcq: int = 40,
        written: int = 0,
        has_key: bool = False,
        has_student_id: bool = False,
    ) -> Dict[str, Any]:
        """Create a template by running sheet_creation.py."""
        args = [
            "--name", name,
            "--mcq", str(mcq),
            "--written", str(written),
            "--quiet",
        ]

        if has_key:
            args.append("--has-key")
        if has_student_id:
            args.append("--has-student-id")

        success, stdout, stderr = self.run_sheet_creation(args)

        if not success:
            error_msg = stderr if stderr else "Unknown error occurred"
            return {
                "success": False,
                "error": f"Sheet creation failed: {error_msg}",
            }

        result = self.parse_output(stdout)

        if "error" in result:
            return {
                "success": False,
                "error": result.get("error", "Unknown error"),
            }

        template_data = result.get("template_data", {})

        if "metadata" in template_data:
            del template_data["metadata"]

        return {
            "success": True,
            "template_data": template_data,
            "file_base64": result.get("file_base64"),
        }

    # ==================================================================
    # HEALTH
    # ==================================================================

    def health_check(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
            "script_exists": self.script_path.exists(),
            "script_path": str(self.script_path),
        }


_engine_service: Optional[OMREngineService] = None


def get_engine_service() -> OMREngineService:
    global _engine_service
    if _engine_service is None:
        _engine_service = OMREngineService()
    return _engine_service