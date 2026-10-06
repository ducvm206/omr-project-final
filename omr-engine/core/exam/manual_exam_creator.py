# core/exam/manual_exam_creator.py
"""Pure input-output manual exam creator - Matches Java ExamConfig structure"""

import os
import sys
import json
from typing import Optional, Tuple, Dict, List, Any
from datetime import datetime

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from core.utils.db_connector import get_db_connector


def log(msg):
    """Log to stderr to avoid interfering with JSON output."""
    print(f"[ManualExamCreator] {msg}", file=sys.stderr)


class ManualExamCreator:
    """
    Pure input-output manual exam creator.
    Accepts the exact Java ExamConfig structure as input.
    Fetches MCQ and written counts from database using template ID.
    """
    
    def __init__(self):
        """Initialize with database connector."""
        self.db = get_db_connector()
    
    def _get_template_counts(self, template_id) -> Tuple[bool, Optional[str], int, int]:
        """
        Get MCQ and written counts from template in database.
        
        Args:
            template_id: Template ID (string or integer)
            
        Returns:
            Tuple of (success, error_message, mcq_count, written_count)
        """
        try:
            log(f"Fetching template counts for ID: {template_id}")
            
            # Convert to integer (since id is BIGINT)
            try:
                template_id_int = int(template_id)
            except (ValueError, TypeError):
                return False, f"Invalid template ID: {template_id}. Must be a number", 0, 0
            
            result = self.db.execute_dict_one(
                """SELECT 
                    mcq_questions, written_questions
                FROM templates 
                WHERE id = %s""",
                (template_id_int,)
            )
            
            if not result:
                return False, f"Template not found with ID: {template_id}", 0, 0
            
            mcq_count = result.get('mcq_questions', 0)
            written_count = result.get('written_questions', 0)
            
            log(f"Template found: MCQ={mcq_count}, Written={written_count}")
            
            return True, None, mcq_count, written_count
            
        except Exception as e:
            return False, f"Database error: {e}", 0, 0
    
    def create_exam(self, exam_config: Dict[str, Any]) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Create a complete manual exam from Java ExamConfig input.
        
        Args:
            exam_config: Dictionary matching Java ExamConfig:
                {
                    "mode": "manual",
                    "name": "Math Final Exam",
                    "templateId": "TEMP-001",
                    "numberOfKeys": "5",
                    "keyA": {"1": ["A"], "2": ["B"], "11": 1.0, ...},
                    "keyB": {"1": ["B"], "2": ["A"], "11": 2.0, ...},
                    "keyC": {},
                    "keyD": {},
                    "keyE": {}
                }
        
        Returns:
            (success, error_message, exam_data_dict)
        """
        # Validate mode
        mode = exam_config.get('mode', 'manual')
        if mode != 'manual':
            return False, f"Invalid mode: {mode}. Expected 'manual'", {}
        
        # Validate required fields
        if not exam_config.get('name'):
            return False, "Exam name is required", {}
        
        template_id = exam_config.get('templateId')
        if not template_id:
            return False, "Template ID is required", {}
        
        # Get numberOfKeys (can be String or int)
        number_of_keys_str = exam_config.get('numberOfKeys', '5')
        try:
            number_of_keys = int(number_of_keys_str)
        except (ValueError, TypeError):
            return False, f"Invalid numberOfKeys: {number_of_keys_str}. Must be a number", {}
        
        if number_of_keys < 1 or number_of_keys > 5:
            return False, f"Number of keys must be between 1 and 5, got {number_of_keys}", {}
        
        # Fetch MCQ and written counts from database
        success, error, mcq_count, written_count = self._get_template_counts(template_id)
        if not success:
            return False, error, {}
        
        # Validate at least one question
        if mcq_count == 0 and written_count == 0:
            return False, "Template has no questions (MCQ or written)", {}
        
        log(f"Using template counts: MCQ={mcq_count}, Written={written_count}")
        
        # Build keys_data from Java ExamConfig structure
        keys_data = {}
        expected_keys = ['A', 'B', 'C', 'D', 'E'][:number_of_keys]
        
        # Determine written question range
        written_start = mcq_count + 1
        written_end = mcq_count + written_count
        
        for letter in expected_keys:
            key_field = f'key{letter}'
            key_map = exam_config.get(key_field, {})
            
            if not key_map:
                # Empty key map - use empty dict
                keys_data[letter] = {
                    'mcq_answers': {},
                    'written_answers': {}
                }
                continue
            
            mcq_answers = {}
            written_answers = {}
            
            for q_num_str, answer in key_map.items():
                try:
                    q_num = int(q_num_str)
                except ValueError:
                    return False, f"Key {letter}: Invalid question number format: {q_num_str}", {}
                
                # Determine if this is MCQ or written answer
                if isinstance(answer, list):
                    # MCQ answer - list of strings
                    if not answer:
                        return False, f"Key {letter}: Empty answer for question {q_num_str}", {}
                    
                    # Validate question number range
                    if q_num < 1 or q_num > mcq_count:
                        return False, f"Key {letter}: MCQ question {q_num} out of range (1-{mcq_count})", {}
                    
                    # Validate and clean MCQ answers
                    cleaned_answers = []
                    for ans in answer:
                        if isinstance(ans, str):
                            if len(ans) > 1:
                                for char in ans:
                                    if char in ['A', 'B', 'C', 'D']:
                                        cleaned_answers.append(char)
                            else:
                                if ans in ['A', 'B', 'C', 'D']:
                                    cleaned_answers.append(ans)
                        elif isinstance(ans, (int, float)):
                            written_answers[q_num_str] = float(ans)
                            continue
                    
                    if cleaned_answers:
                        mcq_answers[q_num_str] = sorted(list(set(cleaned_answers)))
                    elif q_num_str not in written_answers:
                        return False, f"Key {letter}: Invalid MCQ answer for question {q_num_str}: {answer}", {}
                        
                elif isinstance(answer, (int, float)):
                    # Written answer - number
                    if q_num < written_start or q_num > written_end:
                        return False, f"Key {letter}: Written question {q_num} out of range ({written_start}-{written_end})", {}
                    written_answers[q_num_str] = float(answer)
                    
                elif isinstance(answer, str):
                    # Try to parse as number
                    try:
                        if q_num < written_start or q_num > written_end:
                            return False, f"Key {letter}: Written question {q_num} out of range ({written_start}-{written_end})", {}
                        written_answers[q_num_str] = float(answer)
                    except ValueError:
                        # Treat as single MCQ answer
                        if q_num < 1 or q_num > mcq_count:
                            return False, f"Key {letter}: MCQ question {q_num} out of range (1-{mcq_count})", {}
                        if answer in ['A', 'B', 'C', 'D']:
                            mcq_answers[q_num_str] = [answer]
                        else:
                            return False, f"Key {letter}: Invalid answer for question {q_num_str}: {answer}", {}
                
                else:
                    return False, f"Key {letter}: Invalid answer type for question {q_num_str}: {type(answer)}", {}
            
            keys_data[letter] = {
                'mcq_answers': mcq_answers,
                'written_answers': written_answers
            }
        
        # Validate each key has complete answers
        for letter in expected_keys:
            key_data = keys_data[letter]
            mcq_answers = key_data['mcq_answers']
            written_answers = key_data['written_answers']
            
            # Check MCQ questions are numbered 1..mcq_count
            missing_mcq = []
            for q_num in range(1, mcq_count + 1):
                if str(q_num) not in mcq_answers:
                    missing_mcq.append(str(q_num))
            
            if missing_mcq:
                return False, f"Key {letter}: Missing MCQ answers for questions: {', '.join(missing_mcq)}", {}
            
            # Check written questions are numbered mcq_count+1 .. mcq_count+written_count
            missing_written = []
            for q_num in range(written_start, written_end + 1):
                if str(q_num) not in written_answers:
                    missing_written.append(str(q_num))
            
            if missing_written:
                return False, f"Key {letter}: Missing written answers for questions: {', '.join(missing_written)}", {}
        
        # Build response matching expected structure
        exam_data = {
            'mode': 'manual',
            'name': exam_config['name'],
            'templateId': template_id,
            'numberOfKeys': str(number_of_keys),
            'keys': keys_data,
            'mcq_count': mcq_count,
            'written_count': written_count,
            'created_at': datetime.now().isoformat()
        }
        
        return True, None, exam_data


# =============================================================================
# JSON INPUT/OUTPUT INTERFACE
# =============================================================================

def process_manual_exam(input_json: dict) -> dict:
    """
    Process manual exam creation request from JSON input.
    
    Input matches Java ExamConfig structure:
    {
        "mode": "manual",
        "name": "Math Final Exam",
        "templateId": "TEMP-001",
        "numberOfKeys": "5",
        "keyA": {"1": ["A"], "2": ["B"], "41": 3.5},
        "keyB": {"1": ["B"], "2": ["A"], "41": 4.0},
        ...
    }
    """
    try:
        creator = ManualExamCreator()
        success, error, exam_data = creator.create_exam(input_json)
        
        if not success:
            return {
                'success': False,
                'error': error,
                'exam_data': None
            }
        
        return {
            'success': True,
            'error': None,
            'exam_data': exam_data
        }
        
    except Exception as e:
        import traceback
        log(f"Error: {e}")
        traceback.print_exc(file=sys.stderr)
        return {
            'success': False,
            'error': str(e),
            'exam_data': None
        }


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == "__main__":
    # Example input matching Java ExamConfig
    example_input = {
        "mode": "manual",
        "name": "Math Final Exam",
        "templateId": "1",
        "numberOfKeys": "5",
        "keyA": {
            "1": ["A"],
            "2": ["B"],
            "3": ["C"],
            "4": ["D"],
            "41": 3.5,
            "42": 2.0,
            "43": 4.0,
            "44": 1.5
        },
        "keyB": {
            "1": ["B"],
            "2": ["A"],
            "3": ["D"],
            "4": ["C"],
            "41": 4.0,
            "42": 1.5,
            "43": 3.0,
            "44": 2.5
        },
        "keyC": {},
        "keyD": {},
        "keyE": {}
    }
    
    result = process_manual_exam(example_input)
    print(json.dumps(result, indent=2, default=str))
