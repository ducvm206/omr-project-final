# omr-engine/template/json_extractor.py
"""JSON Template Extractor - Extracts template data and returns clean JSON"""

import os
import json
from typing import Optional, Tuple, Dict, Any, List
from datetime import datetime

import cv2
import numpy as np
try:
    import fitz  # PyMuPDF
except ImportError:
    import pymupdf as fitz  # Fallback for newer versions

# Fix: Use relative import
from .config import SheetConfig, ExtractionConfig


class JSONTemplateExtractor:
    """
    Extracts answer sheet template from PDF and returns clean JSON.
    No database dependencies - pure logic only.
    """
    
    # =========================================================================
    # CONSTANTS
    # =========================================================================
    
    # Marker sizes in points (1 point = 1/72 inch)
    ID_MARKER_PT = 10
    WRITTEN_MARKER_PT = 9
    KEY_MARKER_PT = 7
    MARKER_TOLERANCE = 0.1
    
    # Bubble detection thresholds
    BUBBLE_MIN_AREA = 100
    BUBBLE_MAX_AREA = 4000
    BUBBLE_MIN_RADIUS = 10
    BUBBLE_MAX_RADIUS = 50
    BUBBLE_CIRCULARITY_THRESHOLD = 0.75
    
    # ID detection thresholds
    ID_MIN_BUBBLES_PER_COLUMN = 7
    ID_MAX_BUBBLES_PER_COLUMN = 12
    ID_X_THRESHOLD = 35
    
    # Key detection thresholds
    KEY_EXPECTED_RADIUS = 35
    KEY_CIRCULARITY_THRESHOLD = 0.7
    KEY_FILL_RATIO_THRESHOLD = 0.4
    KEY_MAX_BUBBLES = 5
    KEY_LABELS = ['A', 'B', 'C', 'D', 'E']
    
    # Written answers thresholds
    WRITTEN_MIN_AREA = 1000
    WRITTEN_MIN_ASPECT_RATIO = 2.0
    WRITTEN_MAX_ASPECT_RATIO = 8.0
    WRITTEN_MIN_WIDTH = 120
    WRITTEN_MIN_HEIGHT = 20
    
    # Visualization colors (BGR)
    COLOR_MCQ_RECT = (255, 0, 0)      # Blue
    COLOR_MCQ_BUBBLE = (0, 255, 0)    # Green
    COLOR_ID = (255, 0, 255)          # Magenta
    COLOR_WRITTEN = (0, 0, 255)       # Red
    COLOR_KEY = (0, 255, 255)         # Yellow
    
    # =========================================================================
    # INITIALIZATION
    # =========================================================================
    
    def __init__(self, files_root: str = "./data"):
        """
        Initialize the JSON template extractor.
        
        Args:
            files_root: Root directory for temporary files
        """
        self.files_root = files_root
    
    # =========================================================================
    # PUBLIC API
    # =========================================================================
    
    def extract(
        self,
        pdf_path: str,
        config: Optional[ExtractionConfig] = None
    ) -> Tuple[bool, Optional[str], Optional[Dict]]:
        """
        Main extraction method - converts PDF to PNG and extracts template data.
        
        Args:
            pdf_path: Path to the PDF file
            config: ExtractionConfig object (uses defaults if None)
        
        Returns:
            Tuple of (success, error_message, template_data_dict)
        """
        config = config or ExtractionConfig()
        
        # Validate inputs
        if not os.path.exists(pdf_path):
            return False, f"PDF file not found: {pdf_path}", None
        
        valid, error = config.validate()
        if not valid:
            return False, error, None
        
        try:
            # Step 1: Convert PDF to PNG
            png_path = self._convert_pdf_to_png(pdf_path, config.dpi)
            if not png_path:
                return False, "Failed to convert PDF to PNG", None
            
            # Step 2: Extract template from image
            template_data = self._extract_from_image(
                png_path, 
                config.dpi, 
                config.show_visualization
            )
            if not template_data:
                return False, "No template data extracted", None
            
            # Step 3: Clean up temporary PNG
            if not config.keep_png:
                self._safe_remove_file(png_path)
            
            # Step 4: Ensure JSON serializable
            template_data = self._ensure_json_serializable(template_data)
            
            # Step 5: Add metadata
            template_data['metadata'] = {
                'source_file': pdf_path.replace('\\', '/'),
                'created_at': datetime.now().isoformat(),
                'extraction_config': {
                    'dpi': config.dpi,
                    'show_visualization': config.show_visualization
                }
            }
            
            return True, None, template_data
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return False, f"Failed to extract template: {e}", None
    
    # =========================================================================
    # CONVERSION HELPERS
    # =========================================================================
    
    def _convert_pdf_to_png(self, pdf_path: str, dpi: int) -> Optional[str]:
        """Convert first page of PDF to PNG."""
        output_folder = os.path.join(self.files_root, "temp")
        os.makedirs(output_folder, exist_ok=True)
        
        pdf_document = fitz.open(pdf_path)
        
        if len(pdf_document) == 0:
            pdf_document.close()
            return None
        
        page = pdf_document[0]
        zoom = dpi / 72
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        
        base_name = os.path.splitext(os.path.basename(pdf_path))[0]
        output_path = os.path.join(output_folder, f"{base_name}_page_1.png")
        pix.save(output_path)
        
        pdf_document.close()
        return output_path
    
    def _points_to_pixels(self, points: float, dpi: int) -> float:
        """Convert points to pixels at given DPI (1 point = 1/72 inch)."""
        return (points * dpi) / 72.0
    
    def _safe_remove_file(self, file_path: str) -> None:
        """Safely remove a file, ignoring errors."""
        try:
            os.remove(file_path)
        except Exception:
            pass
    
    def _ensure_json_serializable(self, data: Any) -> Any:
        """Recursively convert numpy types to Python types for JSON serialization."""
        if isinstance(data, dict):
            return {str(key): self._ensure_json_serializable(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [self._ensure_json_serializable(item) for item in data]
        elif isinstance(data, np.integer):
            return int(data)
        elif isinstance(data, np.floating):
            return float(data)
        elif isinstance(data, np.ndarray):
            return data.tolist()
        elif isinstance(data, (int, float, str, bool, type(None))):
            return data
        else:
            return str(data)
    
    # =========================================================================
    # IMAGE EXTRACTION
    # =========================================================================
    
    def _extract_from_image(
        self,
        image_path: str,
        dpi: int,
        show_visualization: bool
    ) -> Optional[Dict]:
        """Extract simplified template data from a PNG image."""
        image = cv2.imread(image_path)
        if image is None:
            return None
        
        height, width = image.shape[:2]
        
        # Detect all regions using corner markers
        id_region = self._detect_corner_markers(
            image, self.ID_MARKER_PT, dpi, show_visualization
        )
        key_region = self._detect_corner_markers(
            image, self.KEY_MARKER_PT, dpi, show_visualization
        )
        written_region = self._detect_corner_markers(
            image, self.WRITTEN_MARKER_PT, dpi, show_visualization
        )
        
        # Extract and simplify components directly
        mcq_questions = self._extract_mcq_questions(
            image, id_region, key_region, written_region
        )
        student_id_data = self._extract_student_id(image, id_region) if id_region else None
        key_data = self._extract_key(image, key_region) if key_region else None
        
        # FIX: Pass MCQ count as start number for written answers
        written_start = len(mcq_questions) + 1
        written_data = self._extract_written_boxes(
            image, written_region, written_start
        ) if written_region else None
        
        # Show full visualization if requested
        if show_visualization:
            self._show_full_visualization(
                image, id_region, key_region, written_region,
                mcq_questions, student_id_data, key_data, written_data
            )
        
        # Return SIMPLIFIED data directly - no cleaning needed
        return {
            "image_dimensions": {
                "width": width,
                "height": height
            },
            "mcq": {
                "questions": mcq_questions
            },
            "student_id": student_id_data,
            "key": key_data,
            "written_answers": written_data
        }
    
    # =========================================================================
    # CORNER MARKER DETECTION
    # =========================================================================
    
    def _detect_corner_markers(
        self,
        image: np.ndarray,
        expected_size_pt: float,
        dpi: int,
        show_debug: bool
    ) -> Optional[Tuple[int, int, int, int]]:
        """Detect four corner markers for a section."""
        expected_px = self._points_to_pixels(expected_size_pt, dpi)
        min_size = expected_px * (1 - self.MARKER_TOLERANCE)
        max_size = expected_px * (1 + self.MARKER_TOLERANCE)
        min_area = (min_size ** 2) * 0.75
        max_area = (max_size ** 2) * 1.25
        
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        markers = []
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_area or area > max_area:
                continue
            
            x, y, w, h = cv2.boundingRect(contour)
            
            if not (min_size <= w <= max_size and min_size <= h <= max_size):
                continue
            
            aspect_ratio = float(w) / h if h > 0 else 0
            if not (0.85 < aspect_ratio < 1.15):
                continue
            
            mask = np.zeros(gray.shape, dtype=np.uint8)
            cv2.drawContours(mask, [contour], -1, 255, -1)
            mean_val = cv2.mean(gray, mask=mask)[0]
            if mean_val > 60:
                continue
            
            fill_ratio = area / (w * h) if (w * h) > 0 else 0
            if fill_ratio < 0.85:
                continue
            
            markers.append((x, y, w, h))
        
        if len(markers) != 4:
            return None
        
        x_min = min(m[0] for m in markers)
        y_min = min(m[1] for m in markers)
        x_max = max(m[0] + m[2] for m in markers)
        y_max = max(m[1] + m[3] for m in markers)
        
        return (x_min, y_min, x_max, y_max)
    
    # =========================================================================
    # MCQ EXTRACTION
    # =========================================================================
    
    def _extract_mcq_questions(
        self,
        image: np.ndarray,
        id_region: Optional[Tuple],
        key_region: Optional[Tuple],
        written_region: Optional[Tuple]
    ) -> List:
        """Extract MCQ questions in simplified format."""
        height, width = image.shape[:2]
        
        # Create mask to exclude other regions
        region_mask = np.ones((height, width), dtype=np.uint8) * 255
        padding = 20
        
        for region in [id_region, key_region, written_region]:
            if region:
                x_min, y_min, x_max, y_max = region
                x_min = max(0, x_min - padding)
                y_min = max(0, y_min - padding)
                x_max = min(width, x_max + padding)
                y_max = min(height, y_max + padding)
                region_mask[y_min:y_max, x_min:x_max] = 0
        
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        thresh = cv2.bitwise_and(thresh, thresh, mask=region_mask)
        
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter for circular bubbles
        bubble_contours = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if not (self.BUBBLE_MIN_AREA < area < self.BUBBLE_MAX_AREA):
                continue
            
            (x, y), radius = cv2.minEnclosingCircle(contour)
            if not (self.BUBBLE_MIN_RADIUS < radius < self.BUBBLE_MAX_RADIUS):
                continue
            
            perimeter = cv2.arcLength(contour, True)
            if perimeter == 0:
                continue
            
            circularity = 4 * np.pi * (area / (perimeter * perimeter))
            if circularity > self.BUBBLE_CIRCULARITY_THRESHOLD:
                bubble_contours.append((int(x), int(y), int(radius), contour))
        
        if not bubble_contours:
            return []
        
        # Sort by row, then column
        bubble_contours = sorted(bubble_contours, key=lambda b: (b[1], b[0]))
        
        # Group into rows
        rows = self._group_into_rows(bubble_contours)
        
        # Group into questions and format simply
        questions = []
        question_counter = 0  # FIX: Global counter for all rows
        
        for row in rows:
            row_questions, question_counter = self._format_questions_from_row(row, question_counter)
            questions.extend(row_questions)
        
        return questions
    
    def _group_into_rows(self, bubble_contours: List) -> List:
        """Group bubble contours into rows based on Y position."""
        rows = []
        y_threshold = 30
        
        for bubble in bubble_contours:
            x, y, r, cnt = bubble
            placed = False
            
            for row in rows:
                avg_y = np.mean([b[1] for b in row])
                if abs(y - avg_y) < y_threshold:
                    row.append(bubble)
                    placed = True
                    break
            
            if not placed:
                rows.append([bubble])
        
        for row in rows:
            row.sort(key=lambda b: b[0])
        
        return rows
    
    def _format_questions_from_row(self, row: List, question_counter: int) -> Tuple[List, int]:
        """
        Format bubbles in a row into simplified question objects.
        
        Args:
            row: List of bubbles in the row
            question_counter: Global question counter (incremented for each question)
        
        Returns:
            Tuple of (questions_list, updated_question_counter)
        """
        questions = []
        
        radii = [b[2] for b in row]
        if not radii:
            return questions, question_counter
        
        median_radius = np.median(radii)
        filtered_row = [b for b in row if abs(b[2] - median_radius) < 0.3 * median_radius]
        filtered_row = sorted(filtered_row, key=lambda b: b[0])
        
        bubble_labels = ['A', 'B', 'C', 'D']
        
        for i in range(0, len(filtered_row), 4):
            group = filtered_row[i:i+4]
            if len(group) == 4:
                question_counter += 1  # FIX: Increment global counter
                question = {
                    'question_number': question_counter,  # FIX: Use global counter
                    'bubbles': []
                }
                
                for j, (x, y, r, cnt) in enumerate(group):
                    if j < len(bubble_labels):
                        question['bubbles'].append({
                            'label': bubble_labels[j],
                            'x': int(x),
                            'y': int(y),
                            'radius': int(r)
                        })
                
                questions.append(question)
        
        return questions, question_counter
    
    # =========================================================================
    # STUDENT ID EXTRACTION
    # =========================================================================
    
    def _extract_student_id(
        self,
        image: np.ndarray,
        id_region: Tuple
    ) -> Optional[Dict]:
        """Extract student ID in simplified format."""
        if not id_region:
            return None
        
        x_min, y_min, x_max, y_max = id_region
        roi = image[y_min:y_max, x_min:x_max]
        gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        
        blurred = cv2.GaussianBlur(gray_roi, (5, 5), 0)
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        kernel = np.ones((2, 2), np.uint8)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Collect bubble statistics
        all_areas = []
        all_radii = []
        
        for contour in contours:
            area = cv2.contourArea(contour)
            (x, y), radius = cv2.minEnclosingCircle(contour)
            all_areas.append(area)
            all_radii.append(radius)
        
        # Determine size thresholds
        if all_areas:
            median_area = np.median(all_areas)
            median_radius = np.median(all_radii)
            min_area = median_area * 0.5
            max_area = median_area * 2.5
            min_radius = median_radius * 0.6
            max_radius = median_radius * 1.8
        else:
            min_area = 50
            max_area = 600
            min_radius = 5
            max_radius = 18
        
        # Filter valid bubbles
        bubble_contours = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_area or area > max_area:
                continue
            
            (x, y), radius = cv2.minEnclosingCircle(contour)
            if radius < min_radius or radius > max_radius:
                continue
            
            perimeter = cv2.arcLength(contour, True)
            circularity = 4 * np.pi * (area / (perimeter * perimeter)) if perimeter > 0 else 0
            
            if circularity > 0.3:
                bubble_contours.append((int(x + x_min), int(y + y_min), int(radius)))
        
        if not bubble_contours:
            return None
        
        # Sort by X and group into columns
        bubble_contours.sort(key=lambda b: b[0])
        columns = self._group_into_id_columns(bubble_contours)
        
        # Filter valid columns (7-12 bubbles)
        valid_columns = []
        for col in columns:
            if self.ID_MIN_BUBBLES_PER_COLUMN <= len(col) <= self.ID_MAX_BUBBLES_PER_COLUMN:
                if len(col) > 10:
                    col = col[:10]
                valid_columns.append(col)
        
        if not valid_columns:
            return None
        
        # Simplified format - only digit_columns
        digit_columns = []
        for col_idx, col in enumerate(valid_columns):
            col.sort(key=lambda b: b[1])
            digit_data = {
                'digit_position': col_idx + 1,
                'bubbles': []
            }
            for row_idx, (x, y, r) in enumerate(col):
                digit_data['bubbles'].append({
                    'digit': row_idx,
                    'x': int(x),
                    'y': int(y),
                    'radius': int(r)
                })
            digit_columns.append(digit_data)
        
        return {'digit_columns': digit_columns}
    
    def _group_into_id_columns(self, bubble_contours: List) -> List:
        """Group ID bubbles into columns based on X position."""
        columns = []
        current_col = []
        
        for b in bubble_contours:
            if not current_col:
                current_col.append(b)
            elif abs(b[0] - np.mean([c[0] for c in current_col])) < self.ID_X_THRESHOLD:
                current_col.append(b)
            else:
                current_col.sort(key=lambda b: b[1])
                columns.append(current_col)
                current_col = [b]
        
        if current_col:
            current_col.sort(key=lambda b: b[1])
            columns.append(current_col)
        
        columns.sort(key=lambda col: np.mean([b[0] for b in col]))
        return columns
    
    # =========================================================================
    # KEY EXTRACTION
    # =========================================================================
    
    def _extract_key(
        self,
        image: np.ndarray,
        key_region: Tuple
    ) -> Optional[List]:
        """Extract answer key in simplified format."""
        if not key_region:
            return None
        
        x_min, y_min, x_max, y_max = key_region
        roi = image[y_min:y_max, x_min:x_max]
        
        if roi.size == 0:
            return None
        
        gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray_roi, (5, 5), 0)
        
        _, thresh_otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        thresh_adaptive = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 11, 2
        )
        thresh = cv2.bitwise_or(thresh_otsu, thresh_adaptive)
        
        kernel = np.ones((3, 3), np.uint8)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        
        expected_radius = self.KEY_EXPECTED_RADIUS
        min_radius = expected_radius * 0.6
        max_radius = expected_radius * 1.4
        min_area = np.pi * (min_radius ** 2)
        max_area = np.pi * (max_radius ** 2)
        
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        bubbles = []
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_area or area > max_area:
                continue
            
            (cx, cy), radius = cv2.minEnclosingCircle(contour)
            if radius < min_radius or radius > max_radius:
                continue
            
            perimeter = cv2.arcLength(contour, True)
            if perimeter == 0:
                continue
            
            circularity = 4 * np.pi * (area / (perimeter * perimeter))
            if circularity < self.KEY_CIRCULARITY_THRESHOLD:
                continue
            
            x, y, w, h = cv2.boundingRect(contour)
            mask = np.zeros(gray_roi.shape, dtype=np.uint8)
            cv2.drawContours(mask, [contour], -1, 255, -1)
            roi_mask = mask[y:y+h, x:x+w]
            fill_ratio = np.sum(roi_mask > 0) / (w * h) if roi_mask.size > 0 else 0
            
            if fill_ratio < self.KEY_FILL_RATIO_THRESHOLD:
                continue
            
            bubbles.append({
                'x': int(cx + x_min),
                'y': int(cy + y_min),
                'radius': int(radius)
            })
        
        # Fallback: Hough Circle detection
        if not bubbles:
            blurred_hough = cv2.medianBlur(gray_roi, 5)
            circles = cv2.HoughCircles(
                blurred_hough,
                cv2.HOUGH_GRADIENT,
                dp=1,
                minDist=min_radius * 2,
                param1=50,
                param2=30,
                minRadius=int(min_radius),
                maxRadius=int(max_radius)
            )
            
            if circles is not None:
                circles = np.round(circles[0, :]).astype(int)
                for (cx, cy, r) in circles:
                    bubbles.append({
                        'x': int(cx + x_min),
                        'y': int(cy + y_min),
                        'radius': int(r)
                    })
        
        if not bubbles:
            return None
        
        # Sort and label - simplified format (no position field)
        bubbles.sort(key=lambda b: b['x'])
        key_bubbles = bubbles[:self.KEY_MAX_BUBBLES]
        
        return [
            {
                'label': self.KEY_LABELS[idx],
                'x': bubble['x'],
                'y': bubble['y'],
                'radius': bubble['radius']
            }
            for idx, bubble in enumerate(key_bubbles)
            if idx < len(self.KEY_LABELS)
        ]
    
    # =========================================================================
    # WRITTEN ANSWERS EXTRACTION
    # =========================================================================
    
    def _extract_written_boxes(
        self,
        image: np.ndarray,
        written_region: Tuple,
        start_number: int = 1  # FIX: Accept start number parameter
    ) -> Optional[Dict]:
        """
        Extract written answer boxes in simplified format.
        
        Args:
            image: Input image
            written_region: Tuple of (x_min, y_min, x_max, y_max)
            start_number: Starting question number (default: 1)
        
        Returns:
            Dictionary with answer_boxes list
        """
        if not written_region:
            return None
        
        x_min, y_min, x_max, y_max = written_region
        roi = image[y_min:y_max, x_min:x_max]
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY_INV)
        
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
        horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
        
        vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 20))
        vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
        
        line_mask = cv2.bitwise_or(horizontal_lines, vertical_lines)
        contours, _ = cv2.findContours(line_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        answer_boxes = []
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < self.WRITTEN_MIN_AREA:
                continue
            
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = float(w) / h if h > 0 else 0
            
            if (self.WRITTEN_MIN_ASPECT_RATIO < aspect_ratio < self.WRITTEN_MAX_ASPECT_RATIO and
                w > self.WRITTEN_MIN_WIDTH and
                h > self.WRITTEN_MIN_HEIGHT):
                
                answer_boxes.append({
                    'x': x_min + x,
                    'y': y_min + y,
                    'width': w,
                    'height': h
                })
        
        if not answer_boxes:
            return None
        
        # Sort by Y position and assign question numbers starting from start_number
        answer_boxes.sort(key=lambda r: r['y'])
        for i, box in enumerate(answer_boxes, start=start_number):  # FIX: Use start_number
            box['question_number'] = i
        
        return {'answer_boxes': answer_boxes}
    
    # =========================================================================
    # VISUALIZATION
    # =========================================================================
    
    def _show_image(self, image: np.ndarray, title: str = "Detection", timeout: int = 0) -> None:
        """Show image in a window for debugging."""
        h, w = image.shape[:2]
        if h > 900:
            scale = 900 / h
            new_w = int(w * scale)
            new_h = int(h * scale)
            image = cv2.resize(image, (new_w, new_h))
        
        cv2.imshow(title, image)
        cv2.waitKey(timeout) if timeout > 0 else cv2.waitKey(0)
        cv2.destroyAllWindows()
    
    def _show_full_visualization(
        self,
        image: np.ndarray,
        id_region: Optional[Tuple],
        key_region: Optional[Tuple],
        written_region: Optional[Tuple],
        mcq_questions: List,
        id_data: Optional[Dict],
        key_data: Optional[List],
        written_data: Optional[Dict]
    ) -> None:
        """Show full visualization with all detected elements."""
        output = image.copy()
        
        # Draw MCQ questions
        for q in mcq_questions:
            if not q.get('bubbles'):
                continue
            
            bubbles = q['bubbles']
            xs = [b['x'] for b in bubbles]
            ys = [b['y'] for b in bubbles]
            avg_r = int(np.mean([b['radius'] for b in bubbles]))
            
            padding = 10
            cv2.rectangle(
                output,
                (min(xs) - padding, min(ys) - avg_r - padding),
                (max(xs) + padding, max(ys) + avg_r + padding),
                self.COLOR_MCQ_RECT, 2
            )
            for b in bubbles:
                cv2.circle(output, (b['x'], b['y']), b['radius'], self.COLOR_MCQ_BUBBLE, 2)
        
        # Draw ID section
        if id_data:
            for col in id_data.get('digit_columns', []):
                bubbles = col.get('bubbles', [])
                if bubbles:
                    xs = [b['x'] for b in bubbles]
                    ys = [b['y'] for b in bubbles]
                    cv2.rectangle(
                        output,
                        (min(xs) - 15, min(ys) - 15),
                        (max(xs) + 15, max(ys) + 15),
                        self.COLOR_ID, 2
                    )
                    for b in bubbles:
                        cv2.circle(output, (b['x'], b['y']), b['radius'], self.COLOR_ID, 1)
        
        # Draw KEY section
        if key_data:
            for k in key_data:
                cv2.circle(output, (k['x'], k['y']), k['radius'] + 2, self.COLOR_KEY, 2)
                cv2.putText(
                    output, k['label'], (k['x'] - 10, k['y'] - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, self.COLOR_KEY, 1
                )
        
        # Draw written answers
        if written_data:
            for box in written_data.get('answer_boxes', []):
                x, y, w, h = box['x'], box['y'], box['width'], box['height']
                cv2.rectangle(output, (x, y), (x + w, y + h), self.COLOR_WRITTEN, 2)
        
        # Draw legend
        legend_y = 30
        cv2.putText(output, "LEGEND:", (10, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        legend_items = [
            ("Blue = MCQ Box", self.COLOR_MCQ_RECT),
            ("Green = MCQ Bubble", self.COLOR_MCQ_BUBBLE),
            ("Magenta = Student ID", self.COLOR_ID),
            ("Yellow = KEY Bubble", self.COLOR_KEY),
            ("Red = Written Box", self.COLOR_WRITTEN)
        ]
        for i, (text, color) in enumerate(legend_items):
            y_pos = legend_y + 25 + i * 20
            cv2.putText(output, text, (10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        self._show_image(output, "FULL TEMPLATE DETECTION")