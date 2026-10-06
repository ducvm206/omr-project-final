# omr-engine/template/config.py
"""Configuration for sheet creation"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class SheetConfig:
    """Configuration for answer sheet generation"""
    name: str = "Untitled Sheet"          # Template/sheet name
    num_mcq_questions: int = 20           # Number of multiple choice questions
    num_written_questions: int = 3        # Number of written answer boxes
    include_student_id: bool = True       # Include student ID bubble section
    include_key: bool = True              # Include answer key section

    # Hardcoded defaults (not configurable)
    PAGE_SIZE: str = 'A4'                 # Fixed to A4
    BUBBLE_RADIUS: int = 8                # Fixed radius in points
    OPTIONS_PER_QUESTION: int = 4         # Fixed options per question
    OPTION_LABELS: list = None            # ['A', 'B', 'C', 'D'] by default

    def __post_init__(self):
        if self.OPTION_LABELS is None:
            self.OPTION_LABELS = ['A', 'B', 'C', 'D']

    def validate(self) -> tuple[bool, Optional[str]]:
        """Validate configuration"""
        if not self.name or not self.name.strip():
            return False, "Template name cannot be empty"
        if self.num_mcq_questions < 0:
            return False, "Number of MCQ questions cannot be negative"
        if self.num_written_questions < 0:
            return False, "Number of written questions cannot be negative"
        if self.num_mcq_questions == 0 and self.num_written_questions == 0:
            return False, "At least one question type must have questions"
        if self.num_mcq_questions > 40:
            return False, "Number of MCQ questions cannot exceed 40"
        return True, None

    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            'name': self.name,
            'num_mcq_questions': self.num_mcq_questions,
            'num_written_questions': self.num_written_questions,
            'include_student_id': self.include_student_id,
            'include_key': self.include_key,
            'page_size': self.PAGE_SIZE,
            'bubble_radius': self.BUBBLE_RADIUS,
            'options_per_question': self.OPTIONS_PER_QUESTION,
            'option_labels': self.OPTION_LABELS
        }


@dataclass
class ExtractionConfig:
    """Configuration for template extraction"""
    dpi: int = 300
    show_visualization: bool = True
    keep_png: bool = False

    def validate(self) -> tuple[bool, Optional[str]]:
        """Validate configuration"""
        if self.dpi < 72:
            return False, "DPI must be at least 72"
        if self.dpi > 600:
            return False, "DPI cannot exceed 600"
        return True, None