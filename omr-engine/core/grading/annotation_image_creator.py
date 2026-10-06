# core/grading/annotation_image_creator.py
"""
Annotation Image Creator - Creates annotated images from OMR sheets with colored overlays
showing correct/incorrect/partial answers, student ID, and answer key detection.
"""

import sys
import cv2
import numpy as np
import base64
from typing import Optional, Dict, Any, List, Tuple

from core.utils.answer_extractor import AnswerExtractor


def log(msg):
    """Log to stderr."""
    print(f"[AnnotationImageCreator] {msg}", file=sys.stderr)


class AnnotationImageCreator:
    """
    Creates annotated images from OMR sheets with colored overlays.
    Shows correct (green), incorrect (red), partial (orange) answers,
    student ID (purple), and answer key (blue).
    """
    
    def __init__(self, extractor: AnswerExtractor = None, quiet: bool = False):
        """
        Initialize AnnotationImageCreator.
        
        Args:
            extractor: AnswerExtractor instance with loaded template
            quiet: Suppress log messages
        """
        self.extractor = extractor
        self.quiet = quiet
        self.template_width = 2550
        self.template_height = 3300
        
    def _log(self, msg: str):
        """Conditionally log messages."""
        if not self.quiet:
            log(msg)
    
    def set_extractor(self, extractor: AnswerExtractor):
        """Set the AnswerExtractor instance."""
        self.extractor = extractor
        if extractor:
            self.template_width = extractor.template_width
            self.template_height = extractor.template_height
    
    def create_annotated_image(
        self,
        image: np.ndarray,
        extraction_result: Dict[str, Any],
        grading_result: Dict[str, Any] = None,
        debug: bool = False
    ) -> Optional[str]:
        """
        Create an annotated image with colored overlays.
        
        Args:
            image: Input image (will be resized to template dimensions)
            extraction_result: Result from AnswerSheetExtractor.extract_raw_answers()
                Format: {
                    'student_id': '12345678',
                    'key_used': 'A',
                    'mcq_answers': {'1': ['A'], '2': ['A', 'C']},
                    'written_answers': {'11': 1.0, '12': None},
                    'has_key_area': True,
                    'has_student_id': True
                }
            grading_result: Grading result with details (optional)
                Format: {
                    'details': {
                        '1': {'status': 'correct', 'is_partial': False},
                        '2': {'status': 'partial', 'is_partial': True},
                        ...
                    }
                }
            debug: Show debug windows
        
        Returns:
            Base64 encoded PNG image, or None if failed
        """
        if self.extractor is None:
            self._log("ERROR: No AnswerExtractor set")
            return None
        
        if image is None:
            self._log("ERROR: No image provided")
            return None
        
        try:
            # Resize image to template dimensions
            img = cv2.resize(image, (self.template_width, self.template_height))
            
            # Colors (BGR format)
            GREEN = (0, 255, 0)      # Correct
            RED = (0, 0, 255)        # Incorrect
            ORANGE = (0, 165, 255)   # Partial
            PURPLE = (255, 0, 255)   # Student ID
            BLUE = (255, 0, 0)       # Answer Key
            GRAY = (128, 128, 128)   # Unfilled/Default
            YELLOW = (0, 255, 255)   # Highlight
            WHITE = (255, 255, 255)  # Text
            
            # ============================================
            # EXTRACT GRADING DETAILS
            # ============================================
            details = {}
            if grading_result:
                # Check if grading_result has 'details' key or is directly the details dict
                if isinstance(grading_result, dict):
                    if 'details' in grading_result:
                        details = grading_result.get('details', {})
                    else:
                        # Assume it's already the details dict
                        details = grading_result
                
                # Log what we found
                self._log(f"Loaded {len(details)} question details from grading result")
                if details:
                    # Log first few entries for debugging
                    for key, value in list(details.items())[:3]:
                        self._log(f"  Q{key}: status={value.get('status', 'unknown')}")
            else:
                self._log("No grading result provided - all bubbles will be gray")
            
            # ============================================
            # 1. DRAW MCQ BUBBLES
            # ============================================
            mcq_answers = extraction_result.get('mcq_answers', {})
            mcq_questions = self.extractor.questions
            
            self._log(f"Drawing {len(mcq_questions)} MCQ questions")
            
            for q in mcq_questions:
                qn = q['question_number']
                q_str = str(qn)
                
                # Get student's selected answers
                selected = mcq_answers.get(q_str, [])
                if not isinstance(selected, list):
                    selected = [selected] if selected else []
                
                # Get status from grading details
                q_detail = details.get(q_str, {})
                status = q_detail.get('status', '')
                is_partial = q_detail.get('is_partial', False)
                
                # Determine color based on status
                if status == 'correct':
                    color = GREEN
                    thickness = 4
                    self._log(f"Q{q_str}: CORRECT (color=GREEN)")
                elif status == 'incorrect':
                    color = RED
                    thickness = 4
                    self._log(f"Q{q_str}: INCORRECT (color=RED)")
                elif status == 'partial' or is_partial:
                    color = ORANGE
                    thickness = 4
                    self._log(f"Q{q_str}: PARTIAL (color=ORANGE)")
                elif selected:
                    # Selected but not graded (fallback)
                    color = GREEN
                    thickness = 2
                    self._log(f"Q{q_str}: selected but no status (color=GREEN thin)")
                else:
                    # Not selected
                    color = GRAY
                    thickness = 1
                    self._log(f"Q{q_str}: not selected (color=GRAY)")
                
                # Draw each bubble from template
                for bubble in q.get('bubbles', []):
                    label = bubble.get('label', '')
                    x = bubble.get('x', 0)
                    y = bubble.get('y', 0)
                    r = bubble.get('radius', 35)
                    
                    # Check if this bubble was filled by the student
                    is_filled = label in selected
                    
                    if is_filled:
                        # Draw colored outline for filled bubbles
                        cv2.circle(img, (int(x), int(y)), int(r), color, thickness)
                        # Add label
                        cv2.putText(img, label, (int(x) - 8, int(y) + 8),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, WHITE, 1)
                    else:
                        # Draw thin gray outline for unfilled
                        cv2.circle(img, (int(x), int(y)), int(r), GRAY, 1)
            
            # ============================================
            # 2. DRAW WRITTEN ANSWERS
            # ============================================
            written_answers = extraction_result.get('written_answers', {})
            
            # Get written boxes from template
            if self.extractor.written_section:
                answer_boxes = self.extractor.written_section.get('answer_boxes', [])
            else:
                answer_boxes = []
            
            self._log(f"Drawing {len(answer_boxes)} written answer boxes")
            
            box_map = {}
            for box in answer_boxes:
                q_num = box.get('question_number')
                if q_num:
                    box_map[str(q_num)] = box
            
            for q_num_str, answer in written_answers.items():
                # Find the box for this question
                box = box_map.get(str(q_num_str), {})
                
                if box:
                    x = box.get('x', 0)
                    y = box.get('y', 0)
                    width = box.get('width', 506)
                    height = box.get('height', 110)
                    
                    # Check status from grading details
                    q_detail = details.get(q_num_str, {})
                    status = q_detail.get('status', 'unknown')
                    is_partial = q_detail.get('is_partial', False)
                    
                    # Determine color
                    if status == 'correct':
                        color = GREEN
                        self._log(f"Written Q{q_num_str}: CORRECT")
                    elif status == 'incorrect':
                        color = RED
                        self._log(f"Written Q{q_num_str}: INCORRECT")
                    elif status == 'partial' or is_partial:
                        color = ORANGE
                        self._log(f"Written Q{q_num_str}: PARTIAL")
                    elif status == 'blank':
                        color = GRAY
                        self._log(f"Written Q{q_num_str}: BLANK")
                    else:
                        color = YELLOW
                        self._log(f"Written Q{q_num_str}: UNKNOWN")
                    
                    # Draw box outline
                    cv2.rectangle(img, (int(x), int(y)), (int(x + width), int(y + height)), color, 3)
                    
                    # Draw the detected answer inside
                    if answer is not None and str(answer) != '' and str(answer) != 'None':
                        cv2.putText(img, str(answer), (int(x + 10), int(y + height - 15)),
                                cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)
                    else:
                        # Show "?" if no answer detected
                        cv2.putText(img, "?", (int(x + 10), int(y + height - 15)),
                                cv2.FONT_HERSHEY_SIMPLEX, 1.0, RED, 2)
            
            # ============================================
            # 3. DRAW STUDENT ID BUBBLES
            # ============================================
            student_id = extraction_result.get('student_id')
            
            if self.extractor.id_template and student_id:
                id_template = self.extractor.id_template
                
                if isinstance(student_id, str) and student_id:
                    for idx, col in enumerate(id_template.get('digit_columns', [])):
                        if idx < len(student_id):
                            digit = student_id[idx]
                            if digit != '_':
                                for bubble in col.get('bubbles', []):
                                    if str(bubble.get('digit')) == digit:
                                        x = bubble.get('x', 0)
                                        y = bubble.get('y', 0)
                                        r = bubble.get('radius', 31)
                                        cv2.circle(img, (int(x), int(y)), int(r), PURPLE, 4)
                                        break
            
            # ============================================
            # 4. DRAW ANSWER KEY BUBBLES
            # ============================================
            key_used = extraction_result.get('key_used')
            
            if self.extractor.key_section and key_used:
                if isinstance(key_used, str) and key_used:
                    for bubble in self.extractor.key_section:
                        label = bubble.get('label')
                        if label == key_used:
                            x = bubble.get('x', 0)
                            y = bubble.get('y', 0)
                            r = bubble.get('radius', 35)
                            cv2.circle(img, (int(x), int(y)), int(r), BLUE, 4)
                            break
            
            # ============================================
            # 5. SHOW DEBUG WINDOW IF ENABLED
            # ============================================
            if debug:
                display_img = img.copy()
                h_display, w_display = display_img.shape[:2]
                max_display_width = 1200
                max_display_height = 900
                
                if w_display > max_display_width or h_display > max_display_height:
                    scale = min(max_display_width / w_display, max_display_height / h_display)
                    new_w = int(w_display * scale)
                    new_h = int(h_display * scale)
                    display_img = cv2.resize(display_img, (new_w, new_h))
                
                cv2.imshow("Annotated Image", display_img)
                cv2.waitKey(0)
                cv2.destroyAllWindows()
            
            # ============================================
            # 6. CONVERT TO BASE64
            # ============================================
            _, buffer = cv2.imencode('.png', img)
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            
            return img_base64
            
        except Exception as e:
            self._log(f"Error creating annotated image: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def create_annotated_image_from_path(
        self,
        image_path: str,
        extraction_result: Dict[str, Any],
        grading_result: Dict[str, Any] = None,
        debug: bool = False
    ) -> Optional[str]:
        """Load image from path and create annotated image."""
        try:
            image = cv2.imread(image_path)
            if image is None:
                self._log(f"Could not load image: {image_path}")
                return None
            return self.create_annotated_image(image, extraction_result, grading_result, debug)
        except Exception as e:
            self._log(f"Error loading image from path: {e}")
            return None
    
    def create_annotated_image_from_base64(
        self,
        base64_string: str,
        extraction_result: Dict[str, Any],
        grading_result: Dict[str, Any] = None,
        debug: bool = False
    ) -> Optional[str]:
        """Load image from base64 and create annotated image."""
        try:
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            import base64 as b64
            image_bytes = b64.b64decode(base64_string)
            np_arr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if image is None:
                self._log("Could not decode image from base64")
                return None
            
            return self.create_annotated_image(image, extraction_result, grading_result, debug)
        except Exception as e:
            self._log(f"Error loading image from base64: {e}")
            return None


# =============================================================================
# CONVENIENCE FUNCTION
# =============================================================================

def create_annotated_image(
    image: np.ndarray,
    extraction_result: Dict[str, Any],
    grading_result: Dict[str, Any] = None,
    extractor: AnswerExtractor = None,
    debug: bool = False,
    quiet: bool = False
) -> Optional[str]:
    """Convenience function to create an annotated image."""
    creator = AnnotationImageCreator(extractor, quiet)
    return creator.create_annotated_image(image, extraction_result, grading_result, debug)