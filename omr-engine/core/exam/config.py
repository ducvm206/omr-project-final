# exam/config.py
"""Exam configuration models for manual and extraction modes."""

from dataclasses import dataclass, field
from typing import Optional, Dict, List, Union, Any
from pathlib import Path


# =============================================================================
# BASE CONFIG
# =============================================================================

@dataclass
class BaseExamConfig:
    """Base configuration for all exam types."""
    name: str
    template_id: str
    number_of_keys: int = 5

    def validate(self) -> None:
        """Validate common fields."""
        if not self.name or not self.name.strip():
            raise ValueError("Exam name cannot be empty")
        if not self.template_id or not self.template_id.strip():
            raise ValueError("Template ID cannot be empty")
        if self.number_of_keys < 1 or self.number_of_keys > 5:
            raise ValueError("Number of keys must be between 1 and 5")


# =============================================================================
# MANUAL EXAM CONFIG
# =============================================================================

@dataclass
class ManualExamConfig(BaseExamConfig):
    """
    Manual exam configuration.
    Answers are provided as maps (question_number -> answer).
    """
    mode: str = "manual"
    
    # Answer maps: key_label -> {question_number: answer}
    # Answer can be:
    #   - List[str] for MCQ: ["A"], ["A", "B"] for multi-select
    #   - float for written answers: 1.0, 2.5
    key_a: Optional[Dict[str, Union[List[str], float]]] = None
    key_b: Optional[Dict[str, Union[List[str], float]]] = None
    key_c: Optional[Dict[str, Union[List[str], float]]] = None
    key_d: Optional[Dict[str, Union[List[str], float]]] = None
    key_e: Optional[Dict[str, Union[List[str], float]]] = None

    def __post_init__(self):
        """Set default empty dicts for keys if not provided."""
        if self.key_a is None:
            self.key_a = {}
        if self.key_b is None:
            self.key_b = {}
        if self.key_c is None:
            self.key_c = {}
        if self.key_d is None:
            self.key_d = {}
        if self.key_e is None:
            self.key_e = {}

    def validate(self) -> None:
        """Validate manual exam configuration."""
        super().validate()
        
        # Check that at least one key has answers
        has_answers = (
            bool(self.key_a) or bool(self.key_b) or 
            bool(self.key_c) or bool(self.key_d) or bool(self.key_e)
        )
        if not has_answers:
            raise ValueError("Manual mode requires at least one key with answers")

    def get_key(self, label: str) -> Dict[str, Union[List[str], float]]:
        """Get the answer map for a specific key label."""
        key_map = {
            "A": self.key_a,
            "B": self.key_b,
            "C": self.key_c,
            "D": self.key_d,
            "E": self.key_e
        }
        return key_map.get(label.upper(), {})

    def get_answer(self, label: str, question_number: int) -> Optional[Union[List[str], float]]:
        """Get the answer for a specific question from a specific key."""
        key_map = self.get_key(label)
        return key_map.get(str(question_number))

    def is_mcq_answer(self, label: str, question_number: int) -> bool:
        """Check if an answer is an MCQ answer (list of strings)."""
        answer = self.get_answer(label, question_number)
        return isinstance(answer, list)

    def is_written_answer(self, label: str, question_number: int) -> bool:
        """Check if an answer is a written answer (float)."""
        answer = self.get_answer(label, question_number)
        return isinstance(answer, (int, float))

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "mode": self.mode,
            "name": self.name,
            "template_id": self.template_id,
            "number_of_keys": self.number_of_keys,
            "key_a": self.key_a,
            "key_b": self.key_b,
            "key_c": self.key_c,
            "key_d": self.key_d,
            "key_e": self.key_e
        }


# =============================================================================
# EXTRACTION EXAM CONFIG
# =============================================================================

@dataclass
class ExtractionExamConfig(BaseExamConfig):
    """
    Extraction exam configuration.
    Answers are extracted from image files.
    """
    mode: str = "extraction"
    
    # File paths for key images
    key_a_file: Optional[str] = None
    key_b_file: Optional[str] = None
    key_c_file: Optional[str] = None
    key_d_file: Optional[str] = None
    key_e_file: Optional[str] = None

    def __post_init__(self):
        """Convert string paths to Path objects if provided."""
        for key in ["key_a_file", "key_b_file", "key_c_file", "key_d_file", "key_e_file"]:
            value = getattr(self, key)
            if value and isinstance(value, str):
                setattr(self, key, Path(value))

    def validate(self) -> None:
        """Validate extraction exam configuration."""
        super().validate()
        
        # Check that at least one key file is provided
        has_files = (
            self.key_a_file is not None or self.key_b_file is not None or
            self.key_c_file is not None or self.key_d_file is not None or
            self.key_e_file is not None
        )
        if not has_files:
            raise ValueError("Extraction mode requires at least one key file")

        # Check that all provided files exist
        for label, file_path in self.get_all_key_files().items():
            if file_path is not None and not file_path.exists():
                raise FileNotFoundError(f"Key {label} file not found: {file_path}")

    def get_key_file(self, label: str) -> Optional[Path]:
        """Get the file path for a specific key label."""
        key_map = {
            "A": self.key_a_file,
            "B": self.key_b_file,
            "C": self.key_c_file,
            "D": self.key_d_file,
            "E": self.key_e_file
        }
        return key_map.get(label.upper())

    def get_all_key_files(self) -> Dict[str, Optional[Path]]:
        """Get all key files as a dictionary."""
        return {
            "A": self.key_a_file,
            "B": self.key_b_file,
            "C": self.key_c_file,
            "D": self.key_d_file,
            "E": self.key_e_file
        }

    def has_key_file(self, label: str) -> bool:
        """Check if a key file exists for a specific label."""
        file_path = self.get_key_file(label)
        return file_path is not None and file_path.exists()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "mode": self.mode,
            "name": self.name,
            "template_id": self.template_id,
            "number_of_keys": self.number_of_keys,
            "key_a_file": str(self.key_a_file) if self.key_a_file else None,
            "key_b_file": str(self.key_b_file) if self.key_b_file else None,
            "key_c_file": str(self.key_c_file) if self.key_c_file else None,
            "key_d_file": str(self.key_d_file) if self.key_d_file else None,
            "key_e_file": str(self.key_e_file) if self.key_e_file else None
        }


# =============================================================================
# FACTORY / HELPER FUNCTIONS
# =============================================================================

def create_exam_config(data: Dict[str, Any]) -> Union[ManualExamConfig, ExtractionExamConfig]:
    """
    Factory function to create the appropriate exam config from dictionary data.
    
    Args:
        data: Dictionary containing exam configuration
        
    Returns:
        ManualExamConfig or ExtractionExamConfig
        
    Raises:
        ValueError: If mode is invalid
    """
    mode = data.get("mode", "manual")
    
    if mode == "manual":
        return ManualExamConfig(
            name=data["name"],
            template_id=data["template_id"],
            number_of_keys=data.get("number_of_keys", 5),
            key_a=data.get("key_a"),
            key_b=data.get("key_b"),
            key_c=data.get("key_c"),
            key_d=data.get("key_d"),
            key_e=data.get("key_e")
        )
    elif mode == "extraction":
        return ExtractionExamConfig(
            name=data["name"],
            template_id=data["template_id"],
            number_of_keys=data.get("number_of_keys", 5),
            key_a_file=data.get("key_a_file"),
            key_b_file=data.get("key_b_file"),
            key_c_file=data.get("key_c_file"),
            key_d_file=data.get("key_d_file"),
            key_e_file=data.get("key_e_file")
        )
    else:
        raise ValueError(f"Invalid mode: {mode}. Must be 'manual' or 'extraction'")


def exam_config_from_json(json_str: str) -> Union[ManualExamConfig, ExtractionExamConfig]:
    """Create exam config from JSON string."""
    import json
    data = json.loads(json_str)
    return create_exam_config(data)