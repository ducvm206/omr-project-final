# core/exam/extraction_exam_creator.py

import os
import sys
import json
import base64
from typing import Optional, Tuple, Dict, Any
from datetime import datetime

import cv2
import numpy as np

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from core.utils.db_connector import get_db_connector
from core.utils.answer_extractor import AnswerExtractor


def log(msg):
    """Log to stderr."""
    print(f"[ExtractionExamCreator] {msg}", file=sys.stderr)


class ExtractionExamCreator:
    """
    Creates extraction exams from key images.
    Uses AnswerExtractor for the actual extraction logic.
    Outputs in the simplified manual key format.
    """
    
    def __init__(self, model_client=None):
        """Initialize with optional model client."""
        self.model_client = model_client
        self.db = get_db_connector()
        self.template_data = None
        self.mcq_count = 0
        self.written_count = 0
        
        if self.model_client is not None:
            log("Model client provided to ExtractionExamCreator")
        else:
            log("WARNING: No model client - digit recognition disabled")
    
    def _load_template(self, template_id) -> Tuple[bool, Optional[str]]:
        """Load template from database."""
        try:
            log(f"Loading template: {template_id}")
            
            try:
                template_id_int = int(template_id)
            except (ValueError, TypeError):
                return False, f"Invalid template ID: {template_id}"
            
            result = self.db.execute_dict_one(
                """SELECT template_json FROM templates WHERE id = %s""",
                (template_id_int,)
            )
            
            if not result:
                return False, f"Template not found: {template_id}"
            
            template_json = result.get('template_json')
            if isinstance(template_json, str):
                self.template_data = json.loads(template_json)
            else:
                self.template_data = template_json
            
            if not self.template_data:
                return False, "Template JSON is empty"
            
            # Extract counts using AnswerExtractor with model client
            extractor = AnswerExtractor(self.model_client)
            success, error = extractor.load_template(self.template_data)
            
            if success:
                self.mcq_count = extractor.mcq_count
                self.written_count = extractor.written_count
                log(f"Loaded: {self.mcq_count} MCQ, {self.written_count} written")
            else:
                log(f"Failed to load template with extractor: {error}")
            
            return success, error
            
        except Exception as e:
            return False, f"Failed to load template: {e}"
    
    def _extract_key(self, image_bytes: bytes) -> Tuple[bool, Optional[str], Dict]:
        """Extract answers from a key image."""
        try:
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return False, "Failed to decode image", {}
            
            # Resize to template dimensions
            resized = cv2.resize(image, (2550, 3300))
            
            # Extract using AnswerExtractor with model client
            extractor = AnswerExtractor(self.model_client)
            success, error = extractor.load_template(self.template_data)
            
            if not success:
                return False, error, {}
            
            answers = extractor.extract_answers(resized)
            
            # Format in manual key style
            result = {
                'mcq_answers': answers.get('mcq_answers', {}),
                'written_answers': answers.get('written_answers', {})
            }
            
            # Log if written answers were detected
            written = result.get('written_answers', {})
            if written:
                detected = sum(1 for v in written.values() if v is not None)
                log(f"Written answers detected: {detected}/{len(written)}")
            else:
                log("No written answers detected")
            
            return True, None, result
            
        except Exception as e:
            return False, str(e), {}
    
    def process_extraction_config(self, exam_config: Dict[str, Any]) -> Tuple[bool, Optional[str], Dict]:
        """
        Process extraction exam config.
        
        Input format:
        {
            "mode": "extraction",
            "name": "Physics Midterm",
            "templateId": "6",
            "numberOfKeys": "5",
            "keyAFile": {"bytes": "base64_encoded"},
            ...
        }
        """
        # Validate
        if exam_config.get('mode') != 'extraction':
            return False, f"Invalid mode: {exam_config.get('mode')}", {}
        
        if not exam_config.get('name'):
            return False, "Exam name is required", {}
        
        template_id = exam_config.get('templateId')
        if not template_id:
            return False, "Template ID is required", {}
        
        try:
            number_of_keys = int(exam_config.get('numberOfKeys', '5'))
        except (ValueError, TypeError):
            return False, f"Invalid numberOfKeys: {exam_config.get('numberOfKeys')}", {}
        
        if number_of_keys < 1 or number_of_keys > 5:
            return False, f"Number of keys must be between 1 and 5", {}
        
        # Load template
        success, error = self._load_template(template_id)
        if not success:
            return False, error, {}
        
        # Process each key
        keys = {}
        expected_keys = ['A', 'B', 'C', 'D', 'E'][:number_of_keys]
        
        for letter in expected_keys:
            file_field = f'key{letter}File'
            file_data = exam_config.get(file_field)
            
            if not file_data:
                keys[letter] = {
                    'mcq_answers': {},
                    'written_answers': {}
                }
                continue
            
            # Extract image bytes
            if isinstance(file_data, dict):
                image_bytes = file_data.get('bytes') or file_data.get('base64')
                if isinstance(image_bytes, str):
                    image_bytes = base64.b64decode(image_bytes)
            elif isinstance(file_data, bytes):
                image_bytes = file_data
            elif isinstance(file_data, str):
                try:
                    image_bytes = base64.b64decode(file_data)
                except Exception:
                    continue
            else:
                continue
            
            success, error, extracted = self._extract_key(image_bytes)
            
            if success:
                keys[letter] = extracted
                log(f"Key {letter} extracted successfully")
            else:
                log(f"Failed to extract key {letter}: {error}")
                keys[letter] = {
                    'mcq_answers': {},
                    'written_answers': {},
                    '_error': error
                }
        
        # Build result in manual key format
        exam_data = {
            'mode': 'extraction',
            'name': exam_config['name'],
            'templateId': template_id,
            'numberOfKeys': str(number_of_keys),
            'keys': keys,
            'mcq_count': self.mcq_count,
            'written_count': self.written_count,
            'created_at': datetime.now().isoformat()
        }
        
        return True, None, exam_data


# =============================================================================
# JSON INTERFACE
# =============================================================================

def process_extraction_exam(input_json: dict) -> dict:
    """Process extraction exam from JSON input."""
    try:
        # Try to get model client from input
        model_client = input_json.get('_modelClient')
        
        # If not provided, try to import from model_client
        if model_client is None:
            try:
                from model.model_client import ModelClient
                model_client = ModelClient.get_instance()
                if not model_client.is_loaded():
                    log("Warning: ModelClient exists but model not loaded")
                    model_client = None
            except Exception as e:
                log(f"Could not get ModelClient: {e}")
                model_client = None
        
        creator = ExtractionExamCreator(model_client)
        success, error, exam_data = creator.process_extraction_config(input_json)
        
        return {
            'success': success,
            'error': error,
            'exam_data': exam_data
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {
            'success': False,
            'error': str(e),
            'exam_data': None
        }


if __name__ == "__main__":
    example = {
        "mode": "extraction",
        "name": "Physics Midterm",
        "templateId": "6",
        "numberOfKeys": "1",
        "keyAFile": {"bytes": "base64_encoded_image_data"}
    }
    result = process_extraction_exam(example)
    print(json.dumps(result, indent=2, default=str))