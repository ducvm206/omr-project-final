# scripts/grading.py
"""
Unified Grading Flow - Main entry point for grading OMR sheets.
Takes a GradingConfig and orchestrates the entire grading process.
"""

import sys
import json
import time
import argparse
from typing import Optional, Tuple, Dict, Any, List
from datetime import datetime

# Add project root to path
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.grading.config import GradingConfig, FileData
from core.grading.answer_sheet_grader import AnswerSheetGrader
from core.grading.answer_sheet_extractor import AnswerSheetExtractor
from core.grading.annotation_image_creator import AnnotationImageCreator
from core.utils.db_connector import get_db_connector
from core.utils.answer_extractor import convert_to_serializable


# =============================================================================
# TIMINGS HELPER
# =============================================================================

class Timings:
    """
    Collects named step durations (in milliseconds) for a single grading run.

    Usage:
        t = Timings()
        t.start()
        with t.step("parse_config"):
            ...
        with t.step("grade"):
            ...
        t.summary()  # {"parse_config": 12.3, "grade": 1450.8, ...}
        t.total_ms()
    """

    def __init__(self):
        self.durations: Dict[str, float] = {}
        self._order: List[str] = []
        self._start: Optional[float] = None

    class _Step:
        def __init__(self, timings: "Timings", name: str):
            self.timings = timings
            self.name = name
            self.t0 = 0.0

        def __enter__(self):
            self.t0 = time.perf_counter()
            return self

        def __exit__(self, exc_type, exc, tb):
            elapsed_ms = (time.perf_counter() - self.t0) * 1000.0
            # Accumulate (in case the same step name is used multiple times).
            self.timings.durations[self.name] = (
                self.timings.durations.get(self.name, 0.0) + elapsed_ms
            )
            if self.name not in self.timings._order:
                self.timings._order.append(self.name)
            status = "FAILED" if exc_type else "OK"
            log(f"  [{self.name}] {status} in {elapsed_ms:.1f} ms")
            return False

    def step(self, name: str) -> "Timings._Step":
        return self._Step(self, name)

    def start(self) -> None:
        self._start = time.perf_counter()

    def total_ms(self) -> float:
        if self._start is None:
            return sum(self.durations.values())
        return (time.perf_counter() - self._start) * 1000.0

    def summary(self) -> Dict[str, float]:
        """Return an ordered dict of step name -> ms."""
        return {name: self.durations[name] for name in self._order}


def log(msg):
    """Log to stderr."""
    print(f"[GradingFlow] {msg}", file=sys.stderr)


def get_model_client(timings: Optional[Timings] = None):
    """
    Get model client instance.

    Args:
        timings: Optional Timings object to record step durations into.

    Returns:
        Model client or None
    """
    timer = timings.step("get_model_client") if timings else _NullStep()
    with timer:
        try:
            from model.model_client import ModelClient
            client = ModelClient.get_instance()

            # Check if model is loaded
            if hasattr(client, 'is_loaded') and not client.is_loaded():
                log("⚠️ Model client loaded but model weights are not loaded")
                if hasattr(client, 'load_model'):
                    log("Attempting to load model...")
                    if timings:
                        with timings.step("get_model_client.load_model"):
                            client.load_model()
                    else:
                        client.load_model()

                    if hasattr(client, 'is_loaded') and client.is_loaded():
                        log("✅ Model loaded successfully")
                    else:
                        log("⚠️ Failed to load model")
            else:
                log("✅ Model client available")

            return client
        except ImportError:
            log("⚠️ ModelClient not available - digit recognition disabled")
            return None
        except Exception as e:
            log(f"⚠️ Failed to load model client: {e}")
            return None


class _NullStep:
    """No-op context manager used when no Timings is provided."""
    def __enter__(self): return self
    def __exit__(self, *a): return False


class GradingFlow:
    """
    Unified grading flow that orchestrates the entire grading process.
    """

    def __init__(self, model_client=None, threshold_percent: int = 90,
                 enable_annotation: bool = True, timings: Optional[Timings] = None):
        """
        Initialize GradingFlow.

        Args:
            model_client: Model client for digit recognition
            threshold_percent: Fill percentage threshold for bubble detection
            enable_annotation: Whether to generate annotated image
            timings: Optional Timings collector shared across the flow
        """
        self.timings = timings or Timings()
        self.timings.start()

        self.model_client = model_client
        self.threshold_percent = threshold_percent
        self.enable_annotation = enable_annotation
        self.grader = None
        self.extractor = None
        self.annotation_creator = None
        self.config = None
        self.result = None
        self.grading_time = None

        # Try to get model client if not provided
        if self.model_client is None:
            self.model_client = get_model_client(self.timings)

        # Initialize grader with model client
        with self.timings.step("init.grader"):
            self.grader = AnswerSheetGrader(self.model_client, threshold_percent)

    # ------------------------------------------------------------------
    # CONFIG LOADING
    # ------------------------------------------------------------------

    def load_config(self, config: GradingConfig) -> Tuple[bool, Optional[str]]:
        try:
            with self.timings.step("load_config"):
                self.config = config
                log(f"Loaded config: examId={config.examId}, partial={config.partial}")
            return True, None
        except Exception as e:
            return False, f"Failed to load config: {e}"

    def load_config_from_dict(self, config_dict: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        try:
            with self.timings.step("load_config.from_dict"):
                self.config = GradingConfig.from_dict(config_dict)
            return self.load_config(self.config)
        except Exception as e:
            return False, f"Failed to load config from dict: {e}"

    def load_config_from_file(self, config_path: str) -> Tuple[bool, Optional[str]]:
        try:
            with self.timings.step("load_config.from_file"):
                with open(config_path, 'r') as f:
                    config_dict = json.load(f)
            return self.load_config_from_dict(config_dict)
        except Exception as e:
            return False, f"Failed to load config from file: {e}"

    def validate_config(self) -> Tuple[bool, Optional[str]]:
        with self.timings.step("validate_config"):
            if self.config is None:
                return False, "No configuration loaded"

            if not self.config.has_answer_sheet():
                return False, "No answer sheet provided"

            if self.config.examId <= 0:
                return False, "Invalid examId"

            return True, None

    # ------------------------------------------------------------------
    # ANNOTATION
    # ------------------------------------------------------------------

    def _create_annotated_image(self, image_data: str, extraction_result: Dict,
                                grading_result: Dict) -> Optional[str]:
        try:
            with self.timings.step("annotation.init_extractor"):
                extractor = AnswerSheetExtractor(self.model_client, self.threshold_percent)
                success, error = extractor.load_config(self.config)

            if not success:
                log(f"Failed to load extractor for annotation: {error}")
                return None

            with self.timings.step("annotation.init_creator"):
                annotation_creator = AnnotationImageCreator(extractor.extractor, quiet=True)

            with self.timings.step("annotation.create_image"):
                annotated_image = annotation_creator.create_annotated_image_from_base64(
                    base64_string=image_data,
                    extraction_result=extraction_result,
                    grading_result=grading_result,
                    debug=False
                )

            if annotated_image:
                log("✅ Annotated image created successfully")
            else:
                log("⚠️ Failed to create annotated image")

            return annotated_image

        except Exception as e:
            log(f"⚠️ Error creating annotated image: {e}")
            return None

    def _get_raw_extraction(self) -> Tuple[bool, Optional[str], Optional[Dict]]:
        try:
            from core.grading.answer_sheet_extractor import extract_from_config

            with self.timings.step("annotation.extract_raw"):
                success, error, raw_answers = extract_from_config(
                    self.config,
                    self.model_client,
                    self.threshold_percent
                )

            return success, error, raw_answers

        except Exception as e:
            return False, str(e), None

    def _extract_grading_details(self, result: Dict) -> Dict:
        details = {}

        with self.timings.step("annotation.extract_details"):
            question_results = result.get('question_results', [])

            for q in question_results:
                q_num = str(q.get('questionNumber'))
                details[q_num] = {
                    'student': q.get('studentAnswer', ''),
                    'correct': q.get('correctAnswer', ''),
                    'status': self._get_status(q),
                    'is_partial': q.get('isPartial', False)
                }

            if details:
                correct_count = sum(1 for d in details.values() if d.get('status') == 'correct')
                partial_count = sum(1 for d in details.values() if d.get('status') == 'partial')
                incorrect_count = sum(1 for d in details.values() if d.get('status') == 'incorrect')
                log(f"Grading details: {correct_count} correct, {partial_count} partial, {incorrect_count} incorrect")

        return details

    def _get_status(self, q: Dict) -> str:
        is_correct = q.get('isCorrect', False)
        is_partial = q.get('isPartial', False)
        student_answer = q.get('studentAnswer', '')

        if is_correct:
            return 'correct'
        elif is_partial:
            return 'partial'
        elif student_answer == '' or student_answer is None:
            return 'blank'
        else:
            return 'incorrect'

    # ------------------------------------------------------------------
    # CORE EXECUTION
    # ------------------------------------------------------------------

    def execute_grading(self) -> Tuple[bool, Optional[str], Optional[Dict]]:
        # Validate config
        with self.timings.step("execute.validate"):
            success, error = self.validate_config()
        if not success:
            return False, error, None

        try:
            self.grading_time = datetime.now()

            # ---- Step 1: Grade the answer sheet ----
            with self.timings.step("execute.grade"):
                log("Starting grading process...")
                success, error, result = self.grader.grade_from_config(self.config)

            if not success:
                return False, error, None

            self.result = result

            # ---- Step 2: Add metadata ----
            with self.timings.step("execute.add_metadata"):
                result['graded_at'] = self.grading_time.isoformat()
                result['grading_duration_ms'] = (
                    (datetime.now() - self.grading_time).total_seconds() * 1000
                )

            # ---- Step 3: Create annotated image (if enabled) ----
            if self.enable_annotation:
                with self.timings.step("execute.annotation_total"):
                    log("Creating annotated image...")

                    # Reuse the raw extraction already produced by the grader
                    # (answer_sheet_grader.grade_from_config stashes it under
                    # "_raw_extraction"). Falls back to a fresh extraction only
                    # if the grader didn't provide one — behavior unchanged.
                    raw_answers = None
                    if isinstance(result, dict):
                        raw_answers = result.pop('_raw_extraction', None)

                    if raw_answers is not None:
                        with self.timings.step("annotation.reuse_raw"):
                            pass  # no-op marker so the log shows reuse happened
                    else:
                        log("No cached raw extraction; re-extracting for annotation...")
                        success, error, raw_answers = self._get_raw_extraction()
                        if not success:
                            log(f"⚠️ Could not get raw extraction for annotation: {error}")
                            raw_answers = None

                    if raw_answers:
                        grading_details = self._extract_grading_details(result)
                        image_data = self.config.get_answer_sheet_bytes()

                        if image_data:
                            annotated_image = self._create_annotated_image(
                                image_data,
                                raw_answers,
                                grading_details
                            )

                            if annotated_image:
                                result['annotated_image'] = annotated_image
                            else:
                                log("⚠️ No annotated image generated")
                        else:
                            log("⚠️ No image data available for annotation")
                    else:
                        log("⚠️ No raw answers available for annotation")
            else:
                log("Annotation skipped (--no-annotation flag set)")
                
            # ---- Step 4: Serialize ----
            with self.timings.step("execute.serialize"):
                serializable = convert_to_serializable(result)

            log("Grading completed successfully")
            return True, None, serializable

        except Exception as e:
            return False, f"Grading execution failed: {e}", None

    # ------------------------------------------------------------------
    # PERSISTENCE
    # ------------------------------------------------------------------

    def save_result_to_db(self, result: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        try:
            with self.timings.step("save.db"):
                db = get_db_connector()

                data = {
                    'student_id': result.get('student_id'),
                    'exam_id': result.get('exam_id'),
                    'key_used': result.get('key_used'),
                    'mcq_correct': result.get('mcq_correct', 0),
                    'mcq_partial': result.get('mcq_partial', 0),
                    'mcq_incorrect': result.get('mcq_incorrect', 0),
                    'mcq_blank': result.get('mcq_blank', 0),
                    'written_correct': result.get('written_correct', 0),
                    'written_incorrect': result.get('written_incorrect', 0),
                    'written_blank': result.get('written_blank', 0),
                    'graded_at': result.get('graded_at')
                }

                grading_result_id = db.insert('grading_results', data, returning='id')

                if grading_result_id and result.get('question_results'):
                    for q_result in result['question_results']:
                        q_data = {
                            'grading_result_id': grading_result_id,
                            'question_number': q_result.get('questionNumber'),
                            'question_type': q_result.get('questionType'),
                            'student_answer': q_result.get('studentAnswer'),
                            'correct_answer': q_result.get('correctAnswer'),
                            'is_correct': q_result.get('isCorrect', False),
                            'is_partial': q_result.get('isPartial', False)
                        }
                        db.insert('question_results', q_data)

                log(f"Saved grading result to database (id: {grading_result_id})")
            return True, None

        except Exception as e:
            return False, f"Failed to save result to database: {e}"

    def save_result_to_file(self, result: Dict[str, Any], output_path: str) -> Tuple[bool, Optional[str]]:
        try:
            with self.timings.step("save.file"):
                with open(output_path, 'w') as f:
                    json.dump(result, f, indent=2, default=str)
                log(f"Saved grading result to file: {output_path}")
            return True, None
        except Exception as e:
            return False, f"Failed to save result to file: {e}"

    # ------------------------------------------------------------------
    # RUN
    # ------------------------------------------------------------------

    def run(self, save_to_db: bool = False, output_path: Optional[str] = None
            ) -> Tuple[bool, Optional[str], Optional[Dict]]:
        success, error, result = self.execute_grading()
        if not success:
            return False, error, None

        if save_to_db:
            success, error = self.save_result_to_db(result)
            if not success:
                log(f"Warning: {error}")

        if output_path:
            success, error = self.save_result_to_file(result, output_path)
            if not success:
                log(f"Warning: {error}")

        return True, None, result


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def grade_from_config(
    config: GradingConfig,
    model_client=None,
    threshold_percent: int = 90,
    save_to_db: bool = False,
    output_path: Optional[str] = None,
    enable_annotation: bool = True,
    timings: Optional[Timings] = None,
) -> Tuple[bool, Optional[str], Optional[Dict]]:
    flow = GradingFlow(model_client, threshold_percent, enable_annotation, timings)
    success, error = flow.load_config(config)
    if not success:
        return False, error, None
    return flow.run(save_to_db, output_path)


def grade_from_dict(
    config_dict: Dict[str, Any],
    model_client=None,
    threshold_percent: int = 90,
    save_to_db: bool = False,
    output_path: Optional[str] = None,
    enable_annotation: bool = True,
    timings: Optional[Timings] = None,
) -> Tuple[bool, Optional[str], Optional[Dict]]:
    flow = GradingFlow(model_client, threshold_percent, enable_annotation, timings)
    success, error = flow.load_config_from_dict(config_dict)
    if not success:
        return False, error, None
    return flow.run(save_to_db, output_path)


def grade_from_file(
    config_path: str,
    model_client=None,
    threshold_percent: int = 90,
    save_to_db: bool = False,
    output_path: Optional[str] = None,
    enable_annotation: bool = True,
    timings: Optional[Timings] = None,
) -> Tuple[bool, Optional[str], Optional[Dict]]:
    flow = GradingFlow(model_client, threshold_percent, enable_annotation, timings)
    success, error = flow.load_config_from_file(config_path)
    if not success:
        return False, error, None
    return flow.run(save_to_db, output_path)


def grade_exam_direct(
    examId: int,
    answer_sheet_base64: str,
    allow_partial: bool = True,
    model_client=None,
    threshold_percent: int = 90,
    save_to_db: bool = False,
    output_path: Optional[str] = None,
    enable_annotation: bool = True,
    timings: Optional[Timings] = None,
) -> Tuple[bool, Optional[str], Optional[Dict]]:
    config = GradingConfig(
        examId=examId,
        partial=allow_partial,
        answerSheet=FileData(bytes=answer_sheet_base64)
    )
    return grade_from_config(
        config, model_client, threshold_percent,
        save_to_db, output_path, enable_annotation, timings
    )


# =============================================================================
# COMMAND LINE INTERFACE
# =============================================================================

def _emit_result(success: bool, result: Optional[Dict], error: Optional[str],
                 timings: Optional[Timings]) -> None:
    """Emit the final JSON to stdout, including timings if available."""
    if success:
        output: Dict[str, Any] = {"success": True, "data": result}
        if timings is not None:
            output["timings"] = timings.summary()
            output["total_ms"] = timings.total_ms()
        print(json.dumps(output, default=str))
    else:
        output = {"success": False, "error": error}
        if timings is not None:
            output["timings"] = timings.summary()
            output["total_ms"] = timings.total_ms()
        print(json.dumps(output, default=str))


def main():
    """Command line interface for grading."""

    # -------------------------------------------------------------------------
    # STDIN MODE (called as a subprocess by the API service)
    # -------------------------------------------------------------------------
    if not sys.stdin.isatty():
        timings = Timings()
        timings.start()

        try:
            with timings.step("read_stdin"):
                raw_input = sys.stdin.read()

            with timings.step("parse_config"):
                input_data = json.loads(raw_input)

            model_client = get_model_client(timings)

            success, error, result = grade_from_dict(
                input_data,
                model_client,
                enable_annotation=True,
                timings=timings,
            )

            with timings.step("emit_output"):
                _emit_result(success, result, error, timings)

            sys.exit(0 if success else 1)

        except json.JSONDecodeError as e:
            with timings.step("emit_output"):
                _emit_result(False, None, f"Invalid JSON input: {e}", timings)
            sys.exit(1)
        except Exception as e:
            with timings.step("emit_output"):
                _emit_result(False, None, str(e), timings)
            sys.exit(1)

    # -------------------------------------------------------------------------
    # INTERACTIVE / CLI MODE
    # -------------------------------------------------------------------------
    parser = argparse.ArgumentParser(description='Unified grading flow for OMR sheets')
    parser.add_argument('--config', type=str, required=True,
                        help='Path to JSON config file')
    parser.add_argument('--output', type=str,
                        help='Path to save grading result (JSON)')
    parser.add_argument('--save-db', action='store_true',
                        help='Save result to database')
    parser.add_argument('--threshold', type=int, default=90,
                        help='Fill percentage threshold for bubble detection (default: 90)')
    parser.add_argument('--no-partial', action='store_true',
                        help='Disable partial credit')
    parser.add_argument('--verbose', action='store_true',
                        help='Enable verbose logging')
    parser.add_argument('--no-model', action='store_true',
                        help='Disable model loading for digit recognition')
    parser.add_argument('--no-annotation', action='store_true',
                        help='Skip generating annotated image')

    args = parser.parse_args()

    if args.verbose:
        log("Verbose mode enabled")

    timings = Timings()
    timings.start()

    model_client = None if args.no_model else get_model_client(timings)
    enable_annotation = not args.no_annotation

    config_dict = None
    with open(args.config, 'r') as f:
        config_dict = json.load(f)

    if args.no_partial:
        config_dict['partial'] = False

    log(f"Starting grading with config: {args.config}")
    log(f"Annotation enabled: {enable_annotation}")

    success, error, result = grade_from_file(
        args.config,
        model_client=model_client,
        threshold_percent=args.threshold,
        save_to_db=args.save_db,
        output_path=args.output,
        enable_annotation=enable_annotation,
        timings=timings,
    )

    if success:
        log("✅ Grading completed successfully!")
    else:
        log(f"❌ Grading failed: {error}")

    with timings.step("emit_output"):
        _emit_result(success, result, error, timings)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()