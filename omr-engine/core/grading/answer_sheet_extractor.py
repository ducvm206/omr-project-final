# core/grading/answer_sheet_extractor.py
"""
Answer Sheet Extractor - Extracts raw bubble selections and written answers
from OMR sheets without performing grading.
"""

import sys
import cv2
import numpy as np
from typing import Optional, Tuple, Dict, Any, List
import base64
import json

from core.utils.answer_extractor import AnswerExtractor, convert_to_serializable
from core.utils.db_connector import get_db_connector
from core.grading.config import GradingConfig


def log(msg):
    """Log to stderr."""
    print(f"[AnswerSheetExtractor] {msg}", file=sys.stderr)


class AnswerSheetExtractor:
    """
    Extracts raw answers from OMR sheets based on grading configuration.
    Only returns what bubbles were picked, no grading performed.
    """
    
    def __init__(self, model_client=None, threshold_percent: int = 90):
        """
        Initialize AnswerSheetExtractor.
        
        Args:
            model_client: Model client for digit recognition
            threshold_percent: Fill percentage threshold for bubble detection
        """
        self.model_client = model_client
        self.threshold_percent = threshold_percent
        self.extractor = None
        self.template_data = None
        self.image = None
        self.resized_image = None
        
    def _fetch_template(self, template_id: int) -> Tuple[bool, Optional[str], Optional[Dict]]:
        """
        Fetch template data from database.
        
        Args:
            template_id: Template ID
            
        Returns:
            Tuple of (success, error_message, template_data)
        """
        try:
            db = get_db_connector()
            
            # Query template
            result = db.execute_dict_one(
                """
                SELECT id, name, mcq_questions, written_questions, 
                       has_key_area, has_student_id_area, template_json
                FROM templates 
                WHERE id = %s
                """,
                (template_id,)
            )
            
            if not result:
                return False, f"Template with ID {template_id} not found", None
            
            # Parse template_json if it's a string
            template_json = result.get('template_json')
            if isinstance(template_json, str):
                template_json = json.loads(template_json)
            
            return True, None, template_json
            
        except Exception as e:
            return False, f"Failed to fetch template: {e}", None
    
    def load_config(self, config: GradingConfig) -> Tuple[bool, Optional[str]]:
        """
        Load grading configuration and prepare for extraction.
        
        Args:
            config: GradingConfig object with examId and answerSheet
            
        Returns:
            Tuple of (success, error_message)
        """
        # Validate config
        if not config.has_answer_sheet():
            return False, "No answer sheet provided in config"
        
        # Fetch template using examId
        try:
            db = get_db_connector()
            
            # Get template_id from exam
            exam_result = db.execute_dict_one(
                """
                SELECT template_id 
                FROM exams 
                WHERE id = %s
                """,
                (config.examId,)
            )
            
            if not exam_result:
                return False, f"Exam with ID {config.examId} not found"
            
            template_id = exam_result.get('template_id')
            
            # Fetch template
            success, error, template_json = self._fetch_template(template_id)
            if not success:
                return False, error
            
            self.template_data = template_json
            
            # Initialize AnswerExtractor
            self.extractor = AnswerExtractor(self.model_client, self.threshold_percent)
            success, error = self.extractor.load_template(template_json)
            if not success:
                return False, error
            
            # Load image from config
            base64_bytes = config.get_answer_sheet_bytes()
            return self._load_image_from_base64(base64_bytes)
            
        except Exception as e:
            return False, f"Failed to load config: {e}"
    
    def _load_image_from_base64(self, base64_string: str) -> Tuple[bool, Optional[str]]:
        """
        Load image from base64 string.
        
        Args:
            base64_string: Base64 encoded image
            
        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Decode base64
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            image_bytes = base64.b64decode(base64_string)
            np_arr = np.frombuffer(image_bytes, np.uint8)
            self.image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if self.image is None:
                return False, "Could not decode image from base64"
            
            # Resize to template dimensions
            self.resized_image = cv2.resize(
                self.image,
                (self.extractor.template_width, self.extractor.template_height)
            )
            return True, None
            
        except Exception as e:
            return False, f"Failed to load image from base64: {e}"
    
    def extract_raw_answers(self) -> Dict[str, Any]:
        """
        Extract raw answers without grading.
        
        Returns:
            Dict with raw extracted data:
            {
                'student_id': str or None,
                'key_used': str or None,
                'mcq_answers': Dict[str, List[str]],  # question_num -> [selected_labels]
                'written_answers': Dict[str, float],   # question_num -> detected_value
                'has_key_area': bool,
                'has_student_id': bool
            }
        """
        if self.resized_image is None:
            return {}
        
        if self.extractor is None:
            return {}
        
        # Convert to grayscale for processing
        if len(self.resized_image.shape) == 3:
            gray = cv2.cvtColor(self.resized_image, cv2.COLOR_BGR2GRAY)
        else:
            gray = self.resized_image
        
        # Extract all fields
        result = {
            'student_id': None,
            'key_used': None,
            'mcq_answers': {},
            'written_answers': {},
            'has_key_area': False,
            'has_student_id': False
        }
        
        # Check if template has key area
        if self.extractor.key_section:
            result['has_key_area'] = True
            result['key_used'] = self.extractor.extract_answer_key(gray)
        
        # Check if template has student ID
        if self.extractor.id_template:
            result['has_student_id'] = True
            result['student_id'] = self.extractor.extract_student_id(gray)
        
        # Extract MCQ answers
        result['mcq_answers'] = self.extractor.extract_mcq_answers(gray)
        
        # Extract written answers (uses color image for better digit detection)
        result['written_answers'] = self.extractor.extract_written_answers(self.resized_image)
        
        # Convert numpy types to Python native types
        return convert_to_serializable(result)
    
    def extract_raw_answers_with_metadata(self) -> Dict[str, Any]:
        """
        Extract raw answers with additional metadata about the extraction process.
        
        Returns:
            Dict with raw extracted data and metadata:
            {
                'student_id': str or None,
                'key_used': str or None,
                'mcq_answers': Dict[str, List[str]],
                'written_answers': Dict[str, float],
                'has_key_area': bool,
                'has_student_id': bool,
                'metadata': {
                    'total_mcq_questions': int,
                    'total_written_questions': int,
                    'mcq_answered': int,
                    'mcq_blank': int,
                    'written_answered': int,
                    'written_blank': int
                }
            }
        """
        raw_answers = self.extract_raw_answers()
        
        # Calculate metadata
        mcq_answers = raw_answers.get('mcq_answers', {})
        written_answers = raw_answers.get('written_answers', {})
        
        total_mcq = len(mcq_answers) if self.extractor else 0
        mcq_answered = sum(1 for v in mcq_answers.values() if v)
        mcq_blank = total_mcq - mcq_answered
        
        total_written = len(written_answers) if self.extractor else 0
        written_answered = sum(1 for v in written_answers.values() if v is not None)
        written_blank = total_written - written_answered
        
        metadata = {
            'total_mcq_questions': total_mcq,
            'total_written_questions': total_written,
            'mcq_answered': mcq_answered,
            'mcq_blank': mcq_blank,
            'written_answered': written_answered,
            'written_blank': written_blank
        }
        
        raw_answers['metadata'] = metadata
        
        return raw_answers


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def extract_from_config(
    config: GradingConfig,
    model_client=None,
    threshold_percent: int = 90
) -> Tuple[bool, Optional[str], Dict[str, Any]]:
    """
    Extract raw answers from a grading configuration.
    
    Args:
        config: GradingConfig object
        model_client: Model client for digit recognition
        threshold_percent: Fill threshold
        
    Returns:
        Tuple of (success, error_message, raw_answers)
    """
    try:
        extractor = AnswerSheetExtractor(model_client, threshold_percent)
        
        # Load config (this fetches template from DB)
        success, error = extractor.load_config(config)
        if not success:
            return False, error, {}
        
        # Extract raw answers
        raw_answers = extractor.extract_raw_answers_with_metadata()
        
        return True, None, raw_answers
        
    except Exception as e:
        return False, str(e), {}


def extract_from_config_dict(
    config_dict: Dict[str, Any],
    model_client=None,
    threshold_percent: int = 90
) -> Tuple[bool, Optional[str], Dict[str, Any]]:
    """
    Extract raw answers from a config dictionary.
    
    Args:
        config_dict: Dictionary representation of GradingConfig
        model_client: Model client for digit recognition
        threshold_percent: Fill threshold
        
    Returns:
        Tuple of (success, error_message, raw_answers)
    """
    try:
        # Convert dict to GradingConfig
        config = GradingConfig.from_dict(config_dict)
        return extract_from_config(config, model_client, threshold_percent)
        
    except Exception as e:
        return False, str(e), {}


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == "__main__":
    import sys
    
    print("=" * 60)
    print("Answer Sheet Extractor Test")
    print("=" * 60)
    
    # Example config
    config = GradingConfig(
        examId=1,
        partial=True,
        answerSheet=GradingConfig.FileData(
            bytes="data:image/jpeg;base64,/9j/4AAQSkZJRg..."  # Your base64 image here
        )
    )
    
    # Extract raw answers
    success, error, raw_answers = extract_from_config(config)
    
    if success:
        print("✅ Extraction successful!")
        print("\nExtracted Data:")
        print(json.dumps(raw_answers, indent=2))
    else:
        print(f"❌ Extraction failed: {error}")