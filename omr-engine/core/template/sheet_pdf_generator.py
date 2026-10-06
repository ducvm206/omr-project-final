# omr-engine/template/sheet_pdf_generator.py
"""Answer sheet PDF generator - Pure logic, no database"""

import os
import base64
import json
from typing import Optional, Tuple, Union
from datetime import datetime
from io import BytesIO

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Fix: Use relative import instead of absolute
from .config import SheetConfig


class AnswerSheetDesigner:
    """Integrated answer sheet designer - no external dependencies"""

    def __init__(self, lato_font_path=None):
        # Default font path: ../fonts/ relative to this file
        if lato_font_path is None:
            # Get the directory of this file (sheet_generator.py)
            current_dir = os.path.dirname(os.path.abspath(__file__))
            # Go up one level to core, then to fonts folder
            fonts_dir = os.path.normpath(os.path.join(current_dir, "..", "fonts"))
            lato_font_path = {
                'regular': os.path.join(fonts_dir, 'Lato-Regular.ttf'),
                'bold': os.path.join(fonts_dir, 'Lato-Bold.ttf')
            }

        self.lato_font_path = lato_font_path

        self.design_config = {
            'page_size': 'Letter',
            'margins': {'top': 10, 'bottom': 50, 'left': 50, 'right': 50},
            'bubble_radius': 8,
            'questions_per_page': 40,
            'options_per_question': 4,
            'option_labels': ['A', 'B', 'C', 'D'],
            'columns': 3,
            'max_questions_per_column': 20,
            'bubble_spacing': 23,
            'row_spacing': 35,
            'question_number_width': 30,
            'font_size': 12,
            'show_question_numbers': True,
            'include_header': True,
            'bubble_line_width': 2,
            'header_height': 80,
            'include_student_id': True,
            'student_id_digits': 8,
            'id_bubble_radius': 7,
            'id_bubble_spacing': 20,
            'id_row_spacing': 22,
            'include_written_boxes': True,
            'written_boxes': 4,
            'written_box_width': 120,
            'written_box_height': 25,
            'written_box_spacing': 8,
            'qn_marker_size': 9,
            'id_marker_size': 10,
            'include_key': True,
            'key_options': ['A', 'B', 'C', 'D', 'E'],
            'key_bubble_radius': 8,
            'key_bubble_spacing': 25,
            'key_section_width': 140,
            'key_section_height': 50,
            'key_marker_size': 7,
        }

        self.presets = {
            10: {'columns': 2, 'max_questions_per_column': 15, 'questions_per_page': 30, 'row_spacing': 35},
            20: {'columns': 2, 'max_questions_per_column': 20, 'questions_per_page': 40, 'row_spacing': 35},
            30: {'columns': 3, 'max_questions_per_column': 20, 'questions_per_page': 40, 'row_spacing': 35},
            40: {'columns': 3, 'max_questions_per_column': 20, 'questions_per_page': 40, 'row_spacing': 35}
        }

        self.pdf_font_registered = False
        self._register_lato_fonts()

    def _register_lato_fonts(self):
        try:
            pdfmetrics.registerFont(TTFont('Lato', self.lato_font_path['regular']))
            pdfmetrics.registerFont(TTFont('Lato-Bold', self.lato_font_path['bold']))
            self.pdf_font_registered = True
        except Exception:
            self.pdf_font_registered = False

    def set_config(self, **kwargs):
        for key, value in kwargs.items():
            if key in self.design_config:
                self.design_config[key] = value

    def create_answer_sheet(self, total_questions, output_path=None, format='pdf', written_boxes=None):
        total_questions = min(total_questions, 40)

        if written_boxes is not None:
            self.design_config['written_boxes'] = written_boxes

        if format.lower() == 'pdf':
            return self._create_pdf_sheet(total_questions, output_path)
        return None

    def _create_pdf_sheet(self, total_questions, output_path=None):
        if self.design_config['page_size'].upper() == 'LETTER':
            page_width, page_height = letter
        else:
            page_width, page_height = A4

        # Create buffer for PDF
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=(page_width, page_height))

        questions_per_page = self.design_config['questions_per_page']
        total_pages = (total_questions + questions_per_page - 1) // questions_per_page

        for page in range(total_pages):
            if page > 0:
                c.showPage()

            self._draw_pdf_header(c, page_width, page_height, page + 1, total_pages)

            if page == 0 and self.design_config['include_key']:
                self._draw_pdf_key(c, page_width, page_height)

            self._draw_pdf_questions(c, page_width, page_height, page, total_questions)

            if page == 0 and self.design_config['include_student_id']:
                self._draw_pdf_student_id(c, page_width, page_height)
            if self.design_config['include_written_boxes']:
                self._draw_pdf_written_boxes(c, page_width, page_height)

        c.save()

        # Get bytes from buffer
        pdf_bytes = buffer.getvalue()
        buffer.close()

        # Optionally save to file if output_path provided
        if output_path:
            output_dir = os.path.dirname(output_path)
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
            with open(output_path, 'wb') as f:
                f.write(pdf_bytes)
            return output_path

        return pdf_bytes

    def _draw_pdf_header(self, c, page_width, page_height, current_page, total_pages):
        margins = self.design_config['margins']
        font_bold = "Lato-Bold" if self.pdf_font_registered else "Helvetica-Bold"
        font_regular = "Lato" if self.pdf_font_registered else "Helvetica"

        if self.design_config['include_header']:
            c.setFont(font_bold, 14)
            c.drawString(margins['left'], page_height - margins['top'] - 10, "ANSWER SHEET")

            c.setFont(font_regular, 9)
            info_y = page_height - margins['top'] - 30
            c.drawString(margins['left'], info_y, "Name: ________________________")
            c.drawString(margins['left'] + 180, info_y, "Date: ____________")

    def _draw_pdf_key(self, c, page_width, page_height):
        margins = self.design_config['margins']
        font_bold = "Lato-Bold" if self.pdf_font_registered else "Helvetica-Bold"

        key_options = self.design_config['key_options']
        key_bubble_radius = self.design_config['key_bubble_radius']
        key_section_width = self.design_config['key_section_width']
        key_section_height = self.design_config['key_section_height']
        marker_size = self.design_config['key_marker_size']

        start_x = page_width - margins['right'] - key_section_width - 30
        start_y = page_height - margins['top'] - key_section_height - 16

        num_options = len(key_options)
        total_bubble_width = (num_options - 1) * key_bubble_radius * 3
        bubble_start_x = start_x + (key_section_width - total_bubble_width) / 2
        bubble_y = start_y + (key_section_height / 2) - key_bubble_radius

        c.setFont(font_bold, 11)
        c.drawString(start_x + 15, start_y + key_section_height - 20, "KEY")

        for i, option in enumerate(key_options):
            bubble_x = bubble_start_x + i * (key_bubble_radius * 3)
            c.setStrokeColorRGB(0, 0, 0)
            c.setFillColorRGB(1, 1, 1)
            c.circle(bubble_x, bubble_y, key_bubble_radius, stroke=1, fill=0)

            c.setFillColorRGB(0, 0, 0)
            c.setFont(font_bold, 10)
            text_width = c.stringWidth(option, font_bold, 10)
            text_x = bubble_x - text_width / 2
            text_y = bubble_y - 3
            c.drawString(text_x, text_y, option)

        box_x1 = start_x + 5
        box_y1 = start_y + 5
        box_x2 = start_x + key_section_width - 5
        box_y2 = start_y + key_section_height - 5

        c.setFillColorRGB(0, 0, 0)
        c.rect(box_x1 - marker_size/2, box_y2 - marker_size/2, marker_size, marker_size, stroke=0, fill=1)
        c.rect(box_x2 - marker_size/2, box_y2 - marker_size/2, marker_size, marker_size, stroke=0, fill=1)
        c.rect(box_x1 - marker_size/2, box_y1 - marker_size/2, marker_size, marker_size, stroke=0, fill=1)
        c.rect(box_x2 - marker_size/2, box_y1 - marker_size/2, marker_size, marker_size, stroke=0, fill=1)

    def _draw_pdf_student_id(self, c, page_width, page_height):
        margins = self.design_config['margins']
        font_bold = "Lato-Bold" if self.pdf_font_registered else "Helvetica-Bold"
        font_regular = "Lato" if self.pdf_font_registered else "Helvetica"

        num_digits = self.design_config['student_id_digits']
        id_bubble_radius = self.design_config['id_bubble_radius']
        id_bubble_spacing = self.design_config['id_bubble_spacing']
        id_row_spacing = self.design_config['id_row_spacing']
        marker_size = self.design_config['id_marker_size']

        id_section_width = num_digits * id_bubble_spacing + 40
        id_section_height = 10 * id_row_spacing + 50

        start_x = page_width - margins['right'] - id_section_width - 10
        start_y = margins['bottom'] + id_section_height - 10

        c.setFont(font_bold, 10)
        c.drawString(start_x + 20, start_y + 25, "STUDENT ID")

        c.setFont(font_regular, 7)
        for col in range(num_digits):
            col_x = start_x + 20 + col * id_bubble_spacing
            c.drawString(col_x - 2, start_y, str(col + 1))

        for row in range(10):
            row_y = start_y - 15 - row * id_row_spacing

            for col in range(num_digits):
                bubble_x = start_x + 20 + col * id_bubble_spacing
                bubble_y = row_y

                c.setStrokeColorRGB(0, 0, 0)
                c.setFillColorRGB(1, 1, 1)
                c.circle(bubble_x, bubble_y, id_bubble_radius, stroke=1, fill=0)

                c.setFillColorRGB(0, 0, 0)
                c.setFont(font_bold, 8)
                digit_str = str(row)
                text_width = c.stringWidth(digit_str, font_bold, 8)
                text_x = bubble_x - text_width / 2
                text_y = bubble_y - 3
                c.drawString(text_x, text_y, digit_str)

        box_x1 = start_x + 5
        box_y1 = start_y - 15 - 9 * id_row_spacing - 15
        box_x2 = start_x + id_section_width - 20
        box_y2 = start_y + 20

        c.setFillColorRGB(0, 0, 0)
        c.rect(box_x1 - marker_size/2, box_y2 - marker_size/2, marker_size, marker_size, stroke=0, fill=1)
        c.rect(box_x2 - marker_size/2, box_y2 - marker_size/2, marker_size, marker_size, stroke=0, fill=1)
        c.rect(box_x1 - marker_size/2, box_y1 - marker_size/2, marker_size, marker_size, stroke=0, fill=1)
        c.rect(box_x2 - marker_size/2, box_y1 - marker_size/2, marker_size, marker_size, stroke=0, fill=1)

    def _draw_pdf_written_boxes(self, c, page_width, page_height):
        margins = self.design_config['margins']
        font_bold = "Lato-Bold" if self.pdf_font_registered else "Helvetica-Bold"

        num_boxes = self.design_config['written_boxes']
        box_width = self.design_config['written_box_width']
        box_height = self.design_config['written_box_height']
        box_spacing = self.design_config['written_box_spacing']
        marker_size = self.design_config['qn_marker_size']

        id_section_height = 10 * self.design_config['id_row_spacing'] + 50
        written_section_height = num_boxes * (box_height + box_spacing) + 40
        written_section_width = box_width + 80

        start_x = page_width - margins['right'] - written_section_width - 10
        start_y = margins['bottom'] + id_section_height + written_section_height + 50

        c.setFont(font_bold, 10)
        c.drawString(start_x + 20, start_y + 4, "WRITTEN ANSWERS")

        for i in range(num_boxes):
            box_num = i + 1
            box_y = start_y - 30 - i * (box_height + box_spacing)

            c.setStrokeColorRGB(0, 0, 0)
            c.setLineWidth(1)
            c.setFillColorRGB(1, 1, 1)
            c.rect(start_x + 30, box_y - box_height, box_width, box_height, stroke=1, fill=0)

            c.setFillColorRGB(0, 0, 0)
            c.setFont(font_bold, 15)
            c.drawString(start_x + 10, box_y - box_height/2 - 5, f"{box_num}.")

        box_x1 = start_x + 5
        box_y1 = start_y - 30 - (num_boxes - 1) * (box_height + box_spacing) - box_height - 30
        box_x2 = start_x + written_section_width - 20
        box_y2 = start_y + 5

        c.setFillColorRGB(0, 0, 0)
        c.rect(box_x1 - marker_size/2, box_y2 - marker_size/2, marker_size, marker_size, stroke=0, fill=1)
        c.rect(box_x2 - marker_size/2, box_y2 - marker_size/2, marker_size, marker_size, stroke=0, fill=1)
        c.rect(box_x1 - marker_size/2, box_y1 - marker_size/2, marker_size, marker_size, stroke=0, fill=1)
        c.rect(box_x2 - marker_size/2, box_y1 - marker_size/2, marker_size, marker_size, stroke=0, fill=1)

    def _draw_pdf_questions(self, c, page_width, page_height, current_page, total_questions):
        margins = self.design_config['margins']
        questions_per_page = self.design_config['questions_per_page']
        columns = self.design_config['columns']
        max_per_column = self.design_config['max_questions_per_column']

        font_bold = "Lato-Bold" if self.pdf_font_registered else "Helvetica-Bold"

        start_question = current_page * questions_per_page
        end_question = min(start_question + questions_per_page, total_questions)
        questions_this_page = end_question - start_question

        content_width = page_width - margins['left'] - margins['right']
        column_width = content_width / columns
        row_spacing = self.design_config['row_spacing']
        bubble_radius = self.design_config['bubble_radius']
        bubble_spacing = self.design_config['bubble_spacing']
        question_number_width = self.design_config['question_number_width']

        start_y = page_height - margins['top'] - self.design_config['header_height']

        question_index = 0
        for col in range(columns):
            col_x = margins['left'] + col * column_width
            remaining_questions = questions_this_page - question_index
            questions_in_column = min(max_per_column, remaining_questions)

            for row in range(questions_in_column):
                question_num = start_question + question_index + 1
                if question_num > end_question:
                    break

                row_y = start_y - row * row_spacing

                if self.design_config['show_question_numbers']:
                    c.setFont(font_bold, self.design_config['font_size'])
                    c.drawString(col_x, row_y - 6, f"{question_num}")

                bubble_start_x = col_x + question_number_width
                for i, option in enumerate(self.design_config['option_labels']):
                    bubble_x = bubble_start_x + i * bubble_spacing
                    bubble_y = row_y - 2

                    c.setStrokeColorRGB(0, 0, 0)
                    c.setFillColorRGB(1, 1, 1)
                    c.circle(bubble_x, bubble_y, bubble_radius, stroke=1, fill=0)

                    c.setFillColorRGB(0, 0, 0)
                    c.setFont(font_bold, self.design_config['font_size'] - 1)
                    text_width = c.stringWidth(option, font_bold, self.design_config['font_size'] - 1)
                    text_x = bubble_x - text_width / 2
                    text_y = bubble_y - (self.design_config['font_size'] - 1) / 3
                    c.drawString(text_x, text_y, option)

                question_index += 1


class SheetGenerator:
    """Handles answer sheet PDF generation"""

    def __init__(self, files_root: str):
        self.files_root = files_root

    def generate(self, config: SheetConfig, output_path: Optional[str] = None) -> Tuple[bool, Optional[str], Optional[Union[str, bytes]]]:
        """
        Generate answer sheet PDF

        Args:
            config: SheetConfig object
            output_path: Optional path to save PDF. If None, returns bytes.

        Returns:
            Tuple of (success, error_message, result)
            - If output_path provided: returns file path on success
            - If output_path is None: returns PDF bytes on success
        """
        valid, error = config.validate()
        if not valid:
            return False, error, None

        try:
            designer = AnswerSheetDesigner()
            designer.set_config(
                include_student_id=config.include_student_id,
                include_key=config.include_key,
                include_written_boxes=(config.num_written_questions > 0),
                written_boxes=config.num_written_questions
            )

            result = designer.create_answer_sheet(
                config.num_mcq_questions,
                output_path,
                format='pdf',
                written_boxes=config.num_written_questions
            )

            return True, None, result

        except Exception as e:
            return False, f"Failed to generate sheet: {e}", None