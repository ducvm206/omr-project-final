# core/grading/answer_sheet_grader.py
"""
Answer Sheet Grader - Performs actual grading by comparing extracted answers
with correct answers from the exam configuration.
"""

import sys
import json
from typing import Optional, Tuple, Dict, Any, List

from core.grading.config import GradingConfig
from core.grading.answer_sheet_extractor import extract_from_config
from core.utils.db_connector import get_db_connector
from core.utils.answer_extractor import convert_to_serializable


def log(msg):
    """Log to stderr."""
    print(f"[AnswerSheetGrader] {msg}", file=sys.stderr)


class AnswerSheetGrader:
    """
    Grades an OMR sheet by comparing extracted answers with correct answers
    from the exam configuration.
    """
    
    def __init__(self, model_client=None, threshold_percent: int = 90):
        """
        Initialize AnswerSheetGrader.
        
        Args:
            model_client: Model client for digit recognition
            threshold_percent: Fill percentage threshold for bubble detection
        """
        self.model_client = model_client
        self.threshold_percent = threshold_percent
        self.exam_data = None
        self.exam_config = None
        
    def _fetch_exam_data(self, examId: int) -> Tuple[bool, Optional[str], Optional[Dict]]:
        """
        Fetch exam data from database.
        
        Args:
            examId: Exam ID
            
        Returns:
            Tuple of (success, error_message, exam_data)
        """
        try:
            db = get_db_connector()
            
            # Query exam with template data
            result = db.execute_dict_one(
                """
                SELECT 
                    e.id,
                    e.name,
                    e.mcq_points,
                    e.written_points,
                    e.total_points,
                    e.no_of_keys,
                    e.exam_json,
                    e.grade_a_threshold,
                    e.grade_b_threshold,
                    e.grade_c_threshold,
                    e.grade_d_threshold,
                    e.template_id,
                    t.template_json
                FROM exams e
                JOIN templates t ON e.template_id = t.id
                WHERE e.id = %s
                """,
                (examId,)
            )
            
            if not result:
                return False, f"Exam with ID {examId} not found", None
            
            # Parse JSON fields
            exam_json = result.get('exam_json')
            if isinstance(exam_json, str):
                exam_json = json.loads(exam_json)
            result['exam_json'] = exam_json
            
            template_json = result.get('template_json')
            if isinstance(template_json, str):
                template_json = json.loads(template_json)
            result['template_json'] = template_json
            
            return True, None, result
            
        except Exception as e:
            return False, f"Failed to fetch exam data: {e}", None
    
    def _extract_correct_answers(
        self, 
        exam_json: Dict, 
        key_used: str = "A"
    ) -> Tuple[Dict[str, List[str]], Dict[str, float]]:
        """
        Extract correct answers from exam JSON.
        
        Supports multiple formats:
        1. {"questions": [{"question_number": 1, "question_type": "MCQ", "correct_answer": ["A"]}]}
        2. {"keys": {"A": {"mcq_answers": {"1": ["A"]}, "written_answers": {"11": 1.0}}}}
        
        Args:
            exam_json: Exam configuration JSON
            key_used: The key that was detected (A, B, C, D, E)
        
        Returns:
            Tuple of (correct_mcq, correct_written)
        """
        correct_mcq = {}
        correct_written = {}
        
        # Format 1: Key-based format (manual or extraction mode)
        if 'keys' in exam_json:
            keys = exam_json.get('keys', {})
            
            # Get the correct key data
            key_data = keys.get(key_used, {})
            
            if key_data:
                log(f"Using key {key_used} for correct answers")
                
                # Extract MCQ answers
                mcq_answers = key_data.get('mcq_answers', {})
                for q_num, answers in mcq_answers.items():
                    if isinstance(answers, str):
                        answers = [ans.strip() for ans in answers.split(',') if ans.strip()]
                    elif not isinstance(answers, list):
                        answers = [str(answers)] if answers else []
                    correct_mcq[str(q_num)] = answers
                
                # Extract written answers
                written_answers = key_data.get('written_answers', {})
                for q_num, value in written_answers.items():
                    if value is not None:
                        try:
                            correct_written[str(q_num)] = float(value)
                        except (ValueError, TypeError):
                            correct_written[str(q_num)] = value
                
                log(f"Extracted {len(correct_mcq)} MCQ answers and {len(correct_written)} written answers for key {key_used}")
                return correct_mcq, correct_written
            else:
                log(f"WARNING: Key {key_used} not found in exam keys. Available keys: {list(keys.keys())}")
                # Fall back to first available key if the detected key doesn't exist
                if keys:
                    first_key = list(keys.keys())[0]
                    log(f"Falling back to first available key: {first_key}")
                    key_data = keys.get(first_key, {})
                    
                    # Extract MCQ answers from fallback key
                    mcq_answers = key_data.get('mcq_answers', {})
                    for q_num, answers in mcq_answers.items():
                        if isinstance(answers, str):
                            answers = [ans.strip() for ans in answers.split(',') if ans.strip()]
                        elif not isinstance(answers, list):
                            answers = [str(answers)] if answers else []
                        correct_mcq[str(q_num)] = answers
                    
                    # Extract written answers from fallback key
                    written_answers = key_data.get('written_answers', {})
                    for q_num, value in written_answers.items():
                        if value is not None:
                            try:
                                correct_written[str(q_num)] = float(value)
                            except (ValueError, TypeError):
                                correct_written[str(q_num)] = value
                    
                    return correct_mcq, correct_written
        
        # Format 2: Questions array format
        questions = exam_json.get('questions', [])
        
        if questions:
            log(f"Found {len(questions)} questions in exam JSON")
            for q in questions:
                q_num = q.get('question_number')
                q_type = q.get('question_type', 'MCQ')
                
                if q_type == 'MCQ':
                    correct_answer = q.get('correct_answer', [])
                    if isinstance(correct_answer, str):
                        correct_answer = [ans.strip() for ans in correct_answer.split(',') if ans.strip()]
                    elif not isinstance(correct_answer, list):
                        correct_answer = [str(correct_answer)] if correct_answer else []
                    correct_mcq[str(q_num)] = correct_answer
                elif q_type == 'WRITTEN':
                    correct_value = q.get('correct_answer')
                    if correct_value is not None:
                        try:
                            correct_written[str(q_num)] = float(correct_value)
                        except (ValueError, TypeError):
                            correct_written[str(q_num)] = correct_value
            
            log(f"Extracted {len(correct_mcq)} MCQ answers and {len(correct_written)} written answers from questions array")
            return correct_mcq, correct_written
        
        # No answers found
        log("WARNING: No correct answers found in exam JSON")
        return correct_mcq, correct_written
    
    def _determine_grade(self, percentage: float, thresholds: Dict[str, float]) -> str:
        """
        Determine letter grade based on percentage and thresholds.
        
        Args:
            percentage: Score percentage
            thresholds: Dict with grade thresholds
            
        Returns:
            Letter grade (A, B, C, D, or F)
        """
        grade_a = thresholds.get('grade_a_threshold', 90.0)
        grade_b = thresholds.get('grade_b_threshold', 75.0)
        grade_c = thresholds.get('grade_c_threshold', 60.0)
        grade_d = thresholds.get('grade_d_threshold', 45.0)
        
        if percentage >= grade_a:
            return 'A'
        elif percentage >= grade_b:
            return 'B'
        elif percentage >= grade_c:
            return 'C'
        elif percentage >= grade_d:
            return 'D'
        else:
            return 'F'
    
    def _calculate_mcq_results(
        self,
        student_answers: Dict[str, List[str]],
        correct_answers: Dict[str, List[str]],
        allow_partial: bool = True
    ) -> Tuple[int, int, int, int, List[Dict]]:
        """
        Calculate MCQ results.
        
        Args:
            student_answers: Student's MCQ answers
            correct_answers: Correct MCQ answers
            allow_partial: Whether to allow partial points
            
        Returns:
            Tuple of (correct, partial, incorrect, blank, question_results)
        """
        correct = 0
        partial = 0
        incorrect = 0
        blank = 0
        question_results = []
        
        # Get all question numbers from correct answers
        all_questions = sorted(correct_answers.keys(), key=lambda x: int(x))
        
        log(f"Calculating MCQ results for {len(all_questions)} questions")
        
        for q_num_str in all_questions:
            q_num = int(q_num_str)
            correct_list = correct_answers.get(q_num_str, [])
            student_list = student_answers.get(q_num_str, [])
            
            # Sort for comparison
            student_sorted = sorted(student_list)
            correct_sorted = sorted(correct_list)
            
            is_correct = False
            is_partial = False
            
            if not student_list:
                # Blank answer
                blank += 1
            elif student_sorted == correct_sorted:
                # Fully correct
                correct += 1
                is_correct = True
            elif allow_partial and any(ans in correct_list for ans in student_list):
                # Partial credit (some correct answers selected)
                partial += 1
                is_partial = True
            else:
                # Incorrect
                incorrect += 1
            
            question_results.append({
                'questionNumber': q_num,
                'questionType': 'MCQ',
                'studentAnswer': ','.join(student_sorted) if student_list else '',
                'correctAnswer': ','.join(correct_sorted),
                'isCorrect': is_correct,
                'isPartial': is_partial
            })
        
        log(f"MCQ Results: Correct={correct}, Partial={partial}, Incorrect={incorrect}, Blank={blank}")
        return correct, partial, incorrect, blank, question_results
    
    def _calculate_written_results(
        self,
        student_answers: Dict[str, float],
        correct_answers: Dict[str, float]
    ) -> Tuple[int, int, int, List[Dict]]:
        """
        Calculate written results.
        
        Args:
            student_answers: Student's written answers
            correct_answers: Correct written answers
            
        Returns:
            Tuple of (correct, incorrect, blank, question_results)
        """
        correct = 0
        incorrect = 0
        blank = 0
        question_results = []
        
        # Get all question numbers from correct answers
        all_questions = sorted(correct_answers.keys(), key=lambda x: int(x))
        
        log(f"Calculating written results for {len(all_questions)} questions")
        
        for q_num_str in all_questions:
            q_num = int(q_num_str)
            correct_val = correct_answers.get(q_num_str)
            student_val = student_answers.get(q_num_str)
            
            is_correct = False
            is_partial = False
            
            if student_val is None:
                # Blank answer
                blank += 1
            elif student_val == correct_val:
                # Fully correct
                correct += 1
                is_correct = True
            else:
                # Incorrect (no partial for written in this implementation)
                incorrect += 1
            
            question_results.append({
                'questionNumber': q_num,
                'questionType': 'WRITTEN',
                'studentAnswer': str(student_val) if student_val is not None else '',
                'correctAnswer': str(correct_val) if correct_val is not None else '',
                'isCorrect': is_correct,
                'isPartial': is_partial
            })
        
        log(f"Written Results: Correct={correct}, Incorrect={incorrect}, Blank={blank}")
        return correct, incorrect, blank, question_results
    
    def grade_from_config(
        self,
        config: GradingConfig
    ) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Grade an answer sheet from a grading configuration.
        
        Args:
            config: GradingConfig object
            
        Returns:
            Tuple of (success, error_message, grading_result)
        """
        try:
            # Step 1: Fetch exam data
            success, error, exam_data = self._fetch_exam_data(config.examId)
            if not success:
                return False, error, {}
            
            self.exam_data = exam_data
            self.exam_config = exam_data.get('exam_json', {})
            
            log(f"Loaded exam config: mode={self.exam_config.get('mode')}, keys={list(self.exam_config.get('keys', {}).keys())}")
            
            # Step 2: Extract raw answers
            success, error, raw_answers = extract_from_config(
                config,
                self.model_client,
                self.threshold_percent
            )
            if not success:
                return False, error, {}
            
            log(f"Extracted raw answers: student_id={raw_answers.get('student_id')}, key_used={raw_answers.get('key_used')}")
            log(f"MCQ answers: {raw_answers.get('mcq_answers', {})}")
            log(f"Written answers: {raw_answers.get('written_answers', {})}")
            
            # Step 3: Get the key that was used
            key_used = raw_answers.get('key_used', 'A')
            if not key_used:
                key_used = 'A'
                log(f"No key detected, defaulting to {key_used}")
            
            # Step 4: Extract correct answers using the detected key
            correct_mcq, correct_written = self._extract_correct_answers(
                self.exam_config, 
                key_used
            )
            
            # If no answers found, try all keys
            if not correct_mcq and not correct_written:
                log("No answers found for detected key, trying all available keys...")
                keys = self.exam_config.get('keys', {})
                for key in keys.keys():
                    log(f"Trying key: {key}")
                    mcq_temp, written_temp = self._extract_correct_answers(self.exam_config, key)
                    if mcq_temp or written_temp:
                        correct_mcq = mcq_temp
                        correct_written = written_temp
                        log(f"Found answers using key: {key}")
                        break
            
            log(f"Final correct answers: {len(correct_mcq)} MCQ, {len(correct_written)} written")
            
            # Step 5: Calculate MCQ results
            mcq_correct, mcq_partial, mcq_incorrect, mcq_blank, mcq_results = \
                self._calculate_mcq_results(
                    raw_answers.get('mcq_answers', {}),
                    correct_mcq,
                    config.partial
                )
            
            # Step 6: Calculate written results
            written_correct, written_incorrect, written_blank, written_results = \
                self._calculate_written_results(
                    raw_answers.get('written_answers', {}),
                    correct_written
                )
            
            # Step 7: Combine all question results (MCQ first, then written)
            all_question_results = mcq_results + written_results
            
            # Step 8: Build grading result
            grading_result = {
                'student_id': raw_answers.get('student_id'),
                'exam_id': config.examId,
                'key_used': key_used,
                'mcq_correct': mcq_correct,
                'mcq_partial': mcq_partial,
                'mcq_incorrect': mcq_incorrect,
                'mcq_blank': mcq_blank,
                'written_correct': written_correct,
                'written_incorrect': written_incorrect,
                'written_blank': written_blank,
                'question_results': all_question_results,
                '_raw_extraction': raw_answers,
            }
            
            log(f"Grading complete: MCQ={mcq_correct}/{len(correct_mcq)}, Written={written_correct}/{len(correct_written)}")
            
            # Convert numpy types to Python native types
            return True, None, convert_to_serializable(grading_result)
            
        except Exception as e:
            import traceback
            log(f"Grading failed: {e}")
            log(traceback.format_exc())
            return False, f"Grading failed: {e}", {}
    
    def grade_from_config_dict(
        self,
        config_dict: Dict[str, Any]
    ) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Grade an answer sheet from a config dictionary.
        
        Args:
            config_dict: Dictionary representation of GradingConfig
            
        Returns:
            Tuple of (success, error_message, grading_result)
        """
        try:
            config = GradingConfig.from_dict(config_dict)
            return self.grade_from_config(config)
        except Exception as e:
            return False, f"Failed to parse config: {e}", {}


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def grade_from_config(
    config: GradingConfig,
    model_client=None,
    threshold_percent: int = 90
) -> Tuple[bool, Optional[str], Dict[str, Any]]:
    """
    Convenience function to grade an answer sheet from a config.
    
    Args:
        config: GradingConfig object
        model_client: Model client for digit recognition
        threshold_percent: Fill threshold
        
    Returns:
        Tuple of (success, error_message, grading_result)
    """
    grader = AnswerSheetGrader(model_client, threshold_percent)
    return grader.grade_from_config(config)


def grade_from_config_dict(
    config_dict: Dict[str, Any],
    model_client=None,
    threshold_percent: int = 90
) -> Tuple[bool, Optional[str], Dict[str, Any]]:
    """
    Convenience function to grade an answer sheet from a config dictionary.
    
    Args:
        config_dict: Dictionary representation of GradingConfig
        model_client: Model client for digit recognition
        threshold_percent: Fill threshold
        
    Returns:
        Tuple of (success, error_message, grading_result)
    """
    grader = AnswerSheetGrader(model_client, threshold_percent)
    return grader.grade_from_config_dict(config_dict)


def grade_exam(
    examId: int,
    answer_sheet_base64: str,
    allow_partial: bool = True,
    model_client=None,
    threshold_percent: int = 90
) -> Tuple[bool, Optional[str], Dict[str, Any]]:
    """
    Convenience function to grade an exam directly.
    
    Args:
        examId: Exam ID
        answer_sheet_base64: Base64 encoded image
        allow_partial: Whether to allow partial points
        model_client: Model client for digit recognition
        threshold_percent: Fill threshold
        
    Returns:
        Tuple of (success, error_message, grading_result)
    """
    from core.grading.config import GradingConfig, FileData
    
    config = GradingConfig(
        examId=examId,
        partial=allow_partial,
        answerSheet=FileData(bytes=answer_sheet_base64)
    )
    
    return grade_from_config(config, model_client, threshold_percent)


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == "__main__":
    import sys
    
    print("=" * 60)
    print("Answer Sheet Grader Test")
    print("=" * 60)
    
    # Example config
    config = GradingConfig(
        examId=1,
        partial=True,
        answerSheet=GradingConfig.FileData(
            bytes="data:image/jpeg;base64,/9j/4AAQSkZJRg..."  # Your base64 image here
        )
    )
    
    # Grade the exam
    success, error, result = grade_from_config(config)
    
    if success:
        print("✅ Grading successful!")
        print("\nGrading Result:")
        print(json.dumps(result, indent=2))
    else:
        print(f"❌ Grading failed: {error}")