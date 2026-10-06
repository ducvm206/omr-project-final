# app/models.py
"""
Pydantic models for the OMR engine API.
"""

from typing import Optional, Dict, Any, Union, List
from pydantic import BaseModel, Field


# =============================================================================
# TEMPLATE MODELS
# =============================================================================

class CreateTemplateRequest(BaseModel):
    """Request model for template creation."""
    name: str = Field(default="Untitled Sheet", description="Template name")
    mcqQuestions: int = Field(default=40, ge=0, le=40, description="Number of MCQ questions (0-40)")
    writtenQuestions: int = Field(default=0, ge=0, le=6, description="Number of written questions (0-6)")
    hasKeyArea: bool = Field(default=False, description="Include answer key section")
    hasStudentIdArea: bool = Field(default=False, description="Include student ID section")

    """Example for docs."""
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Math Exam 2024",
                "mcqQuestions": 40,
                "writtenQuestions": 4,
                "hasKeyArea": True,
                "hasStudentIdArea": True
            }
        }


class TemplateResponse(BaseModel):
    """Standard API response model for template creation."""
    success: bool
    templateData: Optional[dict] = None
    fileBase64: Optional[str] = None
    error: Optional[str] = None


# =============================================================================
# EXAM MODELS
# =============================================================================

class ExamKeyMap(BaseModel):
    """A single key map (keyA, keyB, etc.) for manual mode."""
    pass  # Dynamic key-value pairs


class ExamConfigRequest(BaseModel):
    """
    Exam configuration request matching Java ExamConfig structure.
    Supports both manual and extraction modes.
    """
    mode: str = Field(..., description="'manual' or 'extraction'")
    name: str = Field(..., description="Exam name")
    templateId: Union[str, int] = Field(..., description="Template ID")
    numberOfKeys: int = Field(default=5, ge=1, le=5, description="Number of keys (1-5)")
    
    # Manual mode fields
    keyA: Optional[Dict[str, Any]] = Field(default=None, description="Key A answers")
    keyB: Optional[Dict[str, Any]] = Field(default=None, description="Key B answers")
    keyC: Optional[Dict[str, Any]] = Field(default=None, description="Key C answers")
    keyD: Optional[Dict[str, Any]] = Field(default=None, description="Key D answers")
    keyE: Optional[Dict[str, Any]] = Field(default=None, description="Key E answers")
    
    # Extraction mode fields
    keyAFile: Optional[Dict[str, Any]] = Field(default=None, description="Key A image file")
    keyBFile: Optional[Dict[str, Any]] = Field(default=None, description="Key B image file")
    keyCFile: Optional[Dict[str, Any]] = Field(default=None, description="Key C image file")
    keyDFile: Optional[Dict[str, Any]] = Field(default=None, description="Key D image file")
    keyEFile: Optional[Dict[str, Any]] = Field(default=None, description="Key E image file")

    class Config:
        json_schema_extra = {
            "example_manual": {
                "mode": "manual",
                "name": "Math Final Exam",
                "templateId": "1",
                "numberOfKeys": "5",
                "keyA": {"1": ["A"], "2": ["B"], "41": 3.5},
                "keyB": {"1": ["B"], "2": ["A"], "41": 4.0}
            },
            "example_extraction": {
                "mode": "extraction",
                "name": "Physics Midterm",
                "templateId": "1",
                "numberOfKeys": "5",
                "keyAFile": {"bytes": "base64_encoded_data"},
                "keyBFile": {"bytes": "base64_encoded_data"}
            }
        }


class ExamResponse(BaseModel):
    """Exam creation response model."""
    success: bool
    exam_data: Optional[dict] = None
    error: Optional[str] = None


# =============================================================================
# GRADING MODELS
# =============================================================================

class GradingFileData(BaseModel):
    """File data for grading."""
    bytes: str = Field(..., description="Base64 encoded image")


class GradingConfigRequest(BaseModel):
    """
    Grading configuration request.
    Matches the Java GradingConfig structure.
    """
    examId: int = Field(..., description="Exam identifier")
    partial: bool = Field(default=True, description="Allow partial points")
    answerSheet: GradingFileData = Field(..., description="Answer sheet base64 bytes")
    
    class Config:
        json_schema_extra = {
            "example": {
                "examId": 101,
                "partial": True,
                "answerSheet": {
                    "bytes": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
                }
            }
        }


class GradingResponse(BaseModel):
    """Grading response model."""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None


# =============================================================================
# PREDICTION MODELS
# =============================================================================

class PredictionResponse(BaseModel):
    """Prediction response model."""
    success: bool
    digit: Optional[int] = None
    confidence: Optional[float] = None
    probabilities: Optional[List[float]] = None
    error: Optional[str] = None


class ModelInfoResponse(BaseModel):
    """Model information response."""
    loaded: bool
    input_shape: Optional[tuple] = None
    output_shape: Optional[tuple] = None
    num_params: Optional[int] = None
    model_path: Optional[str] = None
    loaded_at: Optional[str] = None