# core/utils/answer_extractor.py
"""
Answer Extractor - Pure extraction logic for OMR sheets
Returns simplified data matching the manual key format.
Used by both exam creation and grading.
"""

import sys
import cv2
import numpy as np
from typing import Optional, Tuple, Dict, List, Any
import base64


def log(msg):
    """Log to stderr."""
    print(f"[AnswerExtractor] {msg}", file=sys.stderr)


def convert_to_serializable(obj):
    """Convert numpy types to Python native types for JSON serialization."""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_to_serializable(item) for item in obj]
    return obj


class AnswerExtractor:
    """
    Extracts answers from OMR sheets.
    Returns simplified format matching manual key structure.
    """
    
    def __init__(self, model_client=None, threshold_percent: int = 90):
        """
        Initialize AnswerExtractor.
        
        Args:
            model_client: Model client for digit recognition
            threshold_percent: Fill percentage threshold for bubble detection
        """
        self.model_client = model_client
        self.threshold_percent = threshold_percent
        
        # Log model client status
        if self.model_client is not None:
            log("Model client provided - digit recognition enabled")
        else:
            log("WARNING: No model client - digit recognition disabled")
        
        # Template data
        self.template_data = None
        self.template_width = 2550
        self.template_height = 3300
        self.questions = []  # List of MCQ questions with bubble positions
        self.key_section = []  # Key bubbles
        self.written_section = {}  # Written answer boxes
        self.id_template = None  # Student ID template
        self.mcq_count = 0
        self.written_count = 0
        
        # Cache for predictions
        self._prediction_cache = {}
    
    # =========================================================================
    # TEMPLATE LOADING
    # =========================================================================
    
    def load_template(self, template_data: dict) -> Tuple[bool, Optional[str]]:
        """
        Load template data.
        
        Args:
            template_data: Template JSON data
            
        Returns:
            Tuple of (success, error_message)
        """
        try:
            self.template_data = template_data
            
            # Extract page data
            page1 = self._extract_page_data(template_data)
            if not page1:
                return False, "No page data found in template"
            
            # Get dimensions
            dims = page1.get('image_dimensions', {})
            self.template_width = dims.get('width', 2550)
            self.template_height = dims.get('height', 3300)
            
            # Extract all data
            self._extract_template_data(page1)
            
            log(f"Loaded template: {self.mcq_count} MCQ, {self.written_count} written")
            return True, None
            
        except Exception as e:
            return False, f"Failed to load template: {e}"
    
    def _extract_page_data(self, template_data: dict) -> Optional[dict]:
        """Extract page data from template, handling different structures."""
        if 'image_dimensions' in template_data and 'mcq' in template_data:
            return template_data
        
        page1 = template_data.get('page_1', {})
        if page1:
            return page1
        
        pages = template_data.get('pages', {})
        page1 = pages.get('page_1', {})
        if page1:
            return page1
        
        return None
    
    def _extract_template_data(self, page1: dict):
        """Extract all template data from page1."""
        # Extract MCQ questions and renumber sequentially
        self.questions = self._extract_questions(page1)
        self.mcq_count = len(self.questions)
        
        # Extract other sections
        self.key_section = page1.get('key', [])
        self.written_section = page1.get('written_answers', {})
        self.id_template = self._extract_id_template(page1)
        
        # Get written count
        if isinstance(self.written_section, dict):
            self.written_count = len(self.written_section.get('answer_boxes', []))
        elif isinstance(self.written_section, list):
            self.written_count = len(self.written_section)
        else:
            self.written_count = 0
    
    def _extract_questions(self, page_data: dict) -> List[dict]:
        """Extract MCQ questions and renumber sequentially."""
        questions = []
        mcq_data = page_data.get('mcq', {})
        
        if 'questions' in mcq_data:
            question_list = mcq_data.get('questions', [])
        else:
            question_list = mcq_data if isinstance(mcq_data, list) else []
        
        for q in question_list:
            question = {
                'question_number': q.get('question_number'),
                'bubbles': []
            }
            for bubble in q.get('bubbles', []):
                question['bubbles'].append({
                    'label': bubble.get('label'),
                    'x': bubble.get('x'),
                    'y': bubble.get('y'),
                    'radius': bubble.get('radius', 35)
                })
            questions.append(question)
        
        # Re-number sequentially
        for idx, q in enumerate(questions, start=1):
            q['question_number'] = idx
        
        return questions
    
    def _extract_id_template(self, page_data: dict) -> Optional[dict]:
        """Extract student ID template."""
        id_data = page_data.get('student_id')
        if not id_data:
            return None
        
        return {
            'total_digits': id_data.get('total_digits', len(id_data.get('digit_columns', []))),
            'digit_columns': id_data.get('digit_columns', [])
        }
    
    # =========================================================================
    # BUBBLE DETECTION
    # =========================================================================
    
    def _check_bubble_filled(self, gray: np.ndarray, x: int, y: int, r: int) -> Tuple[bool, float]:
        """
        Check if a bubble is filled.
        
        Args:
            gray: Grayscale image
            x, y: Center of bubble
            r: Radius of bubble
            
        Returns:
            Tuple of (is_filled, fill_percentage)
        """
        h, w = gray.shape[:2]
        if x < 0 or x >= w or y < 0 or y >= h:
            return False, 0.0
        
        mask = np.zeros(gray.shape[:2], dtype=np.uint8)
        cv2.circle(mask, (int(x), int(y)), int(r), 255, -1)
        
        circle_pixels = cv2.countNonZero(mask)
        if circle_pixels == 0:
            return False, 0.0
        
        bubble_region = cv2.bitwise_and(gray, gray, mask=mask)
        _, thresh = cv2.threshold(bubble_region, 127, 255, cv2.THRESH_BINARY_INV)
        dark_pixels = cv2.countNonZero(cv2.bitwise_and(thresh, thresh, mask=mask))
        
        fill_pct = float((dark_pixels / circle_pixels) * 100)
        return fill_pct >= self.threshold_percent, fill_pct
    
    # =========================================================================
    # DIGIT RECOGNITION
    # =========================================================================
    
    def _predict_digit(self, roi: np.ndarray) -> Tuple[Optional[int], float]:
        """
        Predict digit using model client.
        
        Args:
            roi: Region of interest
            
        Returns:
            Tuple of (predicted_digit, confidence)
        """
        if self.model_client is None:
            return None, 0.0
        
        try:
            # Try different prediction methods
            if hasattr(self.model_client, 'predict'):
                result = self.model_client.predict(roi)
                
                # Handle tuple return
                if isinstance(result, tuple):
                    if len(result) == 2:
                        return result
                    elif len(result) == 3:
                        return result[0], result[1]
                
                # Handle object with attributes
                elif hasattr(result, 'digit') and hasattr(result, 'confidence'):
                    if result.success:
                        return result.digit, result.confidence
                    return None, 0.0
                
                # Handle dict return
                elif isinstance(result, dict):
                    if result.get('success', False):
                        return result.get('digit'), result.get('confidence', 0.0)
                    return None, 0.0
            
            # Try direct function call
            elif callable(self.model_client):
                result = self.model_client(roi)
                if isinstance(result, tuple) and len(result) >= 2:
                    return result[0], result[1]
            
            return None, 0.0
            
        except Exception as e:
            log(f"Prediction failed: {e}")
            return None, 0.0
    
    def _detect_digits(self, region: np.ndarray) -> Tuple[Optional[str], float, List]:
        """
        Detect digits in a region.
        
        Args:
            region: Image region
            
        Returns:
            Tuple of (detected_string, average_confidence, individual_detections)
        """
        if region.size == 0:
            return None, 0.0, []
        
        if len(region.shape) == 3:
            gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        else:
            gray = region
        
        h, w = gray.shape
        
        # Apply CLAHE for contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Crop border
        crop_percent = 0.10
        crop_h = int(h * crop_percent)
        crop_w = int(w * crop_percent)
        
        if crop_h < h // 3 and crop_w < w // 3:
            gray_cropped = enhanced[crop_h:h-crop_h, crop_w:w-crop_w]
            
            # Threshold
            blurred = cv2.GaussianBlur(gray_cropped, (3, 3), 0)
            _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            
            # Morphological operations
            kernel = np.ones((2, 2), np.uint8)
            thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
            
            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            detections = []
            
            for cnt in contours:
                area = cv2.contourArea(cnt)
                x, y, cnt_w, cnt_h = cv2.boundingRect(cnt)
                aspect = cnt_w / cnt_h if cnt_h > 0 else 0
                
                if area < 60 or area > 2000:
                    continue
                if aspect < 0.15 or aspect > 1.5:
                    continue
                
                actual_x = x + crop_w
                actual_y = y + crop_h
                
                # Add padding
                pad_h = int(cnt_h * 0.2)
                pad_w = int(cnt_w * 0.2)
                min_pad = 5
                
                pad_top = max(min_pad, pad_h)
                pad_bottom = max(min_pad, pad_h)
                pad_left = max(min_pad, pad_w)
                pad_right = max(min_pad, pad_w)
                
                ex1 = max(0, actual_x - pad_left)
                ey1 = max(0, actual_y - pad_top)
                ex2 = min(w, actual_x + cnt_w + pad_right)
                ey2 = min(h, actual_y + cnt_h + pad_bottom)
                
                digit_roi = gray[ey1:ey2, ex1:ex2]
                
                if digit_roi.size == 0:
                    continue
                
                # Make square
                roi_h, roi_w = digit_roi.shape
                square_size = max(roi_h, roi_w) + 10
                square_roi = np.ones((square_size, square_size), dtype=np.uint8) * 255
                
                y_offset = (square_size - roi_h) // 2
                x_offset = (square_size - roi_w) // 2
                square_roi[y_offset:y_offset+roi_h, x_offset:x_offset+roi_w] = digit_roi
                
                digit, conf = self._predict_digit(square_roi)
                
                if digit is not None and conf > 0.35:
                    detections.append({
                        "digit": str(digit),
                        "confidence": conf,
                        "cx": actual_x + cnt_w // 2
                    })
            
            if detections:
                detections.sort(key=lambda d: d['cx'])
                merged = ''.join(d['digit'] for d in detections)
                avg_conf = np.mean([d['confidence'] for d in detections])
                return merged, float(avg_conf), detections
        
        return None, 0.0, []
    
    # =========================================================================
    # MAIN EXTRACTION METHODS
    # =========================================================================
    
    def extract_mcq_answers(self, image: np.ndarray) -> Dict[str, List[str]]:
        """
        Extract MCQ answers in simplified format.
        
        Args:
            image: Image array
            
        Returns:
            Dict mapping question number to list of selected labels
            Example: {"1": ["A"], "2": ["A", "C"]}
        """
        if not self.questions:
            return {}
        
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        answers = {}
        for q in self.questions:
            q_num = q['question_number']
            selected = []
            
            for bubble in q.get('bubbles', []):
                x = bubble.get('x', 0)
                y = bubble.get('y', 0)
                r = bubble.get('radius', 35)
                label = bubble.get('label', '')
                
                is_filled, _ = self._check_bubble_filled(gray, int(x), int(y), int(r))
                if is_filled:
                    selected.append(label)
            
            answers[str(q_num)] = sorted(selected)
        
        return answers
    
    def extract_written_answers(self, image: np.ndarray) -> Dict[str, float]:
        """
        Extract written answers in simplified format.
        
        Args:
            image: Image array
            
        Returns:
            Dict mapping question number to detected value
            Example: {"11": 1.0, "12": 2.0}
        """
        if not self.written_section:
            return {}
        
        if isinstance(self.written_section, dict):
            answer_boxes = self.written_section.get('answer_boxes', [])
        else:
            answer_boxes = []
        
        if not answer_boxes:
            return {}
        
        written_answers = {}
        self._prediction_cache = {}
        
        for box in answer_boxes:
            q_num = box.get('question_number')
            x = box.get('x')
            y = box.get('y')
            w = box.get('width')
            h = box.get('height')
            
            if not all([x is not None, y is not None, w is not None, h is not None]):
                continue
            
            y1 = int(y)
            y2 = int(y + h)
            x1 = int(x)
            x2 = int(x + w)
            
            # Ensure bounds
            img_h, img_w = image.shape[:2]
            y1 = max(0, min(y1, img_h - 1))
            y2 = max(0, min(y2, img_h))
            x1 = max(0, min(x1, img_w - 1))
            x2 = max(0, min(x2, img_w))
            
            if y2 <= y1 or x2 <= x1:
                continue
            
            region = image[y1:y2, x1:x2]
            
            if region.size == 0:
                continue
            
            digit_value, confidence, _ = self._detect_digits(region)
            
            if digit_value:
                try:
                    written_answers[str(q_num)] = float(digit_value)
                except ValueError:
                    written_answers[str(q_num)] = digit_value
            else:
                written_answers[str(q_num)] = None
        
        return written_answers
    
    def extract_student_id(self, image: np.ndarray) -> Optional[str]:
        """
        Extract student ID.
        
        Args:
            image: Image array
            
        Returns:
            Student ID string or None
        """
        if not self.id_template:
            return None
        
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        student_id = []
        
        for column in self.id_template.get('digit_columns', []):
            filled_digits = []
            
            for bubble in column.get('bubbles', []):
                digit = bubble.get('digit')
                x = bubble.get('x', 0)
                y = bubble.get('y', 0)
                r = bubble.get('radius', 31)
                
                is_filled, _ = self._check_bubble_filled(gray, int(x), int(y), int(r))
                if is_filled:
                    filled_digits.append(digit)
            
            if len(filled_digits) == 1:
                student_id.append(str(filled_digits[0]))
            else:
                student_id.append('_')
        
        return ''.join(student_id)
    
    def extract_answer_key(self, image: np.ndarray) -> Optional[str]:
        """
        Extract answer key.
        
        Args:
            image: Image array
            
        Returns:
            Key letter or None
        """
        if not self.key_section:
            return None
        
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        filled = []
        fill_pct = {}
        
        for bubble in self.key_section:
            x = bubble.get('x')
            y = bubble.get('y')
            r = bubble.get('radius', 35)
            label = bubble.get('label')
            
            if x is not None and y is not None:
                is_filled, pct = self._check_bubble_filled(gray, int(x), int(y), int(r))
                fill_pct[label] = pct
                if is_filled:
                    filled.append(label)
        
        if len(filled) == 1:
            return filled[0]
        elif len(filled) > 1:
            return max(filled, key=lambda x: fill_pct.get(x, 0))
        else:
            return None
    
    # =========================================================================
    # FULL EXTRACTION
    # =========================================================================
    
    def extract_answers(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Extract all answers in simplified format.
        
        Args:
            image: Image array
            
        Returns:
            Dict with mcq_answers, written_answers, student_id, answer_key
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        return {
            'mcq_answers': self.extract_mcq_answers(gray),
            'written_answers': self.extract_written_answers(image),
            'student_id': self.extract_student_id(gray),
            'answer_key': self.extract_answer_key(gray)
        }


# =============================================================================
# CONVENIENCE FUNCTION
# =============================================================================

def extract_answers_from_image(
    image_path: str,
    template_data: dict,
    model_client=None,
    threshold_percent: int = 90
) -> Tuple[bool, Optional[str], Dict[str, Any]]:
    """
    Convenience function to extract answers from an image.
    
    Args:
        image_path: Path to image file
        template_data: Template JSON data
        model_client: Model client for digit recognition
        threshold_percent: Fill threshold
        
    Returns:
        Tuple of (success, error_message, answers)
    """
    try:
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            return False, f"Could not load image: {image_path}", {}
        
        # Initialize extractor with model client
        extractor = AnswerExtractor(model_client, threshold_percent)
        success, error = extractor.load_template(template_data)
        
        if not success:
            return False, error, {}
        
        # Resize to template dimensions
        resized = cv2.resize(image, (extractor.template_width, extractor.template_height))
        
        # Extract answers
        answers = extractor.extract_answers(resized)
        
        return True, None, answers
        
    except Exception as e:
        return False, str(e), {}