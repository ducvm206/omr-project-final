# core/grading/config.py
"""
Grading Configuration - Configuration for grading a single exam.
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass, field


@dataclass
class FileData:
    """
    File data for answer sheet.
    """
    bytes: str  # Base64 encoded image
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'bytes': self.bytes
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FileData':
        """Create from dictionary."""
        return cls(
            bytes=data.get('bytes', '')
        )


@dataclass
class GradingConfig:
    """
    Grading configuration for a single exam.
    """
    examId: int  # Exam identifier
    partial: bool = True  # Allow partial points
    answerSheet: Optional[FileData] = None  # Answer sheet base64 bytes
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'examId': self.examId,
            'partial': self.partial,
            'answerSheet': self.answerSheet.to_dict() if self.answerSheet else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'GradingConfig':
        """Create from dictionary."""
        answer_sheet_data = data.get('answerSheet')
        answerSheet = None
        if answer_sheet_data:
            answerSheet = FileData.from_dict(answer_sheet_data)
        
        return cls(
            examId=data.get('examId', 0),
            partial=data.get('partial', True),
            answerSheet=answerSheet
        )
    
    def get_answer_sheet_bytes(self) -> Optional[str]:
        """Get the base64 bytes of the answer sheet."""
        if self.answerSheet:
            return self.answerSheet.bytes
        return None
    
    def has_answer_sheet(self) -> bool:
        """Check if answer sheet is provided."""
        return self.answerSheet is not None and bool(self.answerSheet.bytes)