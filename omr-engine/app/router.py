# app/router.py
"""
Controller layer - Defines REST API endpoints for the OMR engine.

All business logic (subprocess execution, JSON parsing, image preprocessing,
model introspection) lives in the service layer. This module only:
  - validates incoming HTTP requests,
  - delegates to the service,
  - formats HTTP responses,
  - and emits logs/request-tracking events.
"""

import time
from typing import Optional, Any, List
from datetime import datetime

from fastapi import (
    APIRouter,
    HTTPException,
    UploadFile,
    File,
    Depends,
    WebSocket,
    WebSocketDisconnect,
)

from .service import get_engine_service
from .model import (
    CreateTemplateRequest,
    TemplateResponse,
    ExamConfigRequest,
    ExamResponse,
    GradingConfigRequest,
    GradingResponse,
    PredictionResponse,
    ModelInfoResponse,
)
from .websocket import ConnectionManager

# Global connection manager
manager = ConnectionManager()

# Router
router = APIRouter(prefix="/eg", tags=["exam-generation"])
engine_service = get_engine_service()


# =============================================================================
# WEBSOCKET ENDPOINT
# =============================================================================

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await manager.connect(websocket)

    try:
        await websocket.send_json({
            "type": "status",
            "data": {
                "connected": True,
                "timestamp": datetime.now().isoformat(),
            },
        })

        await websocket.send_json({
            "type": "history",
            "data": {
                "requests": manager.get_requests(20),
                "logs": manager.get_logs(20),
            },
        })

        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "echo", "data": data})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)
        manager.add_log("ERROR", f"WebSocket error: {e}")


# =============================================================================
# MODEL CLIENT DEPENDENCY
# =============================================================================

def get_model_client():
    """Dependency to get the model client."""
    try:
        from model.model_client import ModelClient
        return ModelClient.get_instance()
    except ImportError:
        manager.add_log("WARNING", "ModelClient not available")
        return None


# =============================================================================
# HEALTH ENDPOINTS
# =============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    status = engine_service.get_model_status()
    return {
        "status": "healthy",
        "model_loaded": status.get("loaded", False),
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/ping")
async def ping():
    """Ping endpoint."""
    return {"pong": True, "timestamp": datetime.now().isoformat()}


# =============================================================================
# MODEL INFORMATION ENDPOINTS
# =============================================================================

@router.get("/model-info", response_model=ModelInfoResponse)
async def model_info(client: Optional[Any] = Depends(get_model_client)):
    """Get information about the loaded model."""
    info = engine_service.get_model_info()

    if "error" in info:
        manager.add_log("ERROR", f"Failed to get model info: {info['error']}")

    return ModelInfoResponse(
        loaded=info.get("loaded", False),
        input_shape=info.get("input_shape"),
        output_shape=info.get("output_shape"),
        num_params=info.get("num_params"),
        model_path=info.get("model_path"),
        loaded_at=info.get("loaded_at"),
        error=info.get("error"),
    )


@router.get("/model-status")
async def model_status():
    """Get simple model status."""
    return engine_service.get_model_status()


# =============================================================================
# PREDICTION ENDPOINT FOR MODEL TESTING
# =============================================================================

@router.post("/predict", response_model=PredictionResponse)
async def predict_digit(
    file: UploadFile = File(...),
    client: Optional[Any] = Depends(get_model_client),
):
    """Predict a digit from an uploaded image."""
    start_time = time.time()

    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")

        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Empty file")

        # Delegate preprocessing to the service
        image_array = engine_service.preprocess_image(contents)

        if client is None:
            duration = time.time() - start_time
            manager.add_request("/predict", "POST", 503, duration)
            return PredictionResponse(
                success=False,
                error="Model not available. Please ensure the model server is running.",
            )

        result = client.predict(image_array)

        duration = time.time() - start_time
        manager.add_request("/predict", "POST", 200, duration, {
            "filename": file.filename,
            "size": len(contents),
            "predicted_digit": result.digit,
            "confidence": result.confidence,
        })

        return PredictionResponse(
            success=True,
            digit=result.digit,
            confidence=result.confidence,
            probabilities=(
                result.probabilities.tolist()
                if hasattr(result, "probabilities") and result.probabilities is not None
                else None
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        duration = time.time() - start_time
        manager.add_request("/predict", "POST", 500, duration)
        manager.add_log("ERROR", f"Prediction failed: {e}")
        return PredictionResponse(success=False, error=str(e))

# =============================================================================
# ENDPOINTS FOR SERVER GUI
# =============================================================================

@router.get("/requests")
async def get_requests(limit: int = 50):
    """Get recent request history."""
    return {
        "total": len(manager.request_history),
        "requests": manager.get_requests(limit),
    }


@router.delete("/requests")
async def clear_requests():
    """Clear request history."""
    manager.request_history = []
    manager.add_log("INFO", "Request history cleared")
    return {"status": "cleared", "timestamp": datetime.now().isoformat()}


@router.get("/logs")
async def get_logs(limit: int = 200, level: str = None):
    """Get recent logs."""
    return {
        "total": len(manager.log_history),
        "logs": manager.get_logs(limit, level),
    }


@router.delete("/logs")
async def clear_logs():
    """Clear log history."""
    manager.log_history = []
    return {"status": "cleared", "timestamp": datetime.now().isoformat()}


# =============================================================================
# TEMPLATE ENDPOINT
# =============================================================================

@router.post("/template", response_model=TemplateResponse)
async def create_template(request: CreateTemplateRequest):
    """Create an answer-sheet template."""
    try:
        manager.add_log("INFO", f"Creating template: {request.name}")

        result = engine_service.create_template(
            name=request.name,
            mcq=request.mcqQuestions,
            written=request.writtenQuestions,
            has_key=request.hasKeyArea,
            has_student_id=request.hasStudentIdArea,
        )

        if not result.get("success"):
            manager.add_log(
                "ERROR", f"Template creation failed: {result.get('error')}"
            )
            return TemplateResponse(
                success=False,
                error=result.get("error", "Unknown error"),
            )

        manager.add_log("INFO", f"Template created successfully: {request.name}")
        return TemplateResponse(
            success=True,
            templateData=result.get("template_data"),
            fileBase64=result.get("file_base64"),
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        manager.add_log("ERROR", f"Template creation error: {e}")
        return TemplateResponse(success=False, error=f"Internal error: {str(e)}")


# =============================================================================
# EXAM ENDPOINTS
# =============================================================================

@router.post("/exam/manual", response_model=ExamResponse)
async def create_manual_exam(request: ExamConfigRequest):
    """
    Create an exam using manual key entry.

    Request body matches Java ExamConfig with manual mode:
    {
        "mode": "manual",
        "name": "Math Final Exam",
        "templateId": "1",
        "numberOfKeys": "5",
        "keyA": {"1": ["A"], "2": ["B"], "41": 3.5},
        "keyB": {"1": ["B"], "2": ["A"], "41": 4.0}
    }
    """
    try:
        if request.mode != "manual":
            return ExamResponse(
                success=False,
                error=f"Invalid mode: {request.mode}. Expected 'manual'",
            )

        manager.add_log("INFO", f"Creating manual exam: {request.name}")

        success, result, error = engine_service.run_exam_creation(
            request.dict(exclude_none=True)
        )

        if not success:
            manager.add_log("ERROR", f"Manual exam creation failed: {error}")
            return ExamResponse(success=False, error=error or "Unknown error")

        manager.add_log("INFO", f"Manual exam created successfully: {request.name}")
        return ExamResponse(
            success=result.get("success", False),
            exam_data=result.get("exam_data"),
            error=result.get("error"),
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        manager.add_log("ERROR", f"Manual exam creation error: {e}")
        return ExamResponse(success=False, error=f"Internal error: {str(e)}")


@router.post("/exam/extraction", response_model=ExamResponse)
async def create_extraction_exam(request: ExamConfigRequest):
    """
    Create an exam using key image extraction.

    Request body matches Java ExamConfig with extraction mode:
    {
        "mode": "extraction",
        "name": "Physics Midterm",
        "templateId": "1",
        "numberOfKeys": "5",
        "keyAFile": {"bytes": "base64_encoded_data"},
        "keyBFile": {"bytes": "base64_encoded_data"}
    }
    """
    try:
        if request.mode != "extraction":
            return ExamResponse(
                success=False,
                error=f"Invalid mode: {request.mode}. Expected 'extraction'",
            )

        manager.add_log("INFO", f"Creating extraction exam: {request.name}")

        success, result, error = engine_service.run_exam_creation(
            request.dict(exclude_none=True)
        )

        if not success:
            manager.add_log("ERROR", f"Extraction exam creation failed: {error}")
            return ExamResponse(success=False, error=error or "Unknown error")

        manager.add_log(
            "INFO", f"Extraction exam created successfully: {request.name}"
        )
        return ExamResponse(
            success=result.get("success", False),
            exam_data=result.get("exam_data"),
            error=result.get("error"),
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        manager.add_log("ERROR", f"Extraction exam creation error: {e}")
        return ExamResponse(success=False, error=f"Internal error: {str(e)}")


# =============================================================================
# GRADING ENDPOINT
# =============================================================================

@router.post("/grade", response_model=GradingResponse)
async def grade_exam(request: GradingConfigRequest):
    """
    Grade an answer sheet using the provided configuration.
    (see original docstring)
    """
    import time
    from app.service import StepTimer  # or wherever you keep it

    timer = StepTimer(prefix="[grade_exam] ")
    timer.start()
    start_time = time.time()

    try:
        with timer.step("grade_exam.add_log_start"):
            manager.add_log("INFO", f"Starting grading for examId: {request.examId}")

        with timer.step("grade_exam.serialize_request"):
            payload = request.dict()

        with timer.step("grade_exam.run_grading"):
            success, result, error = engine_service.run_grading(payload)

        duration = time.time() - start_time

        if not success:
            manager.add_log("ERROR", f"Grading failed: {error}")
            manager.add_request("/grade", "POST", 500, duration, {
                "examId": request.examId,
                "error": error,
            })
            return GradingResponse(success=False, error=error or "Unknown error")

        with timer.step("grade_exam.extract_data"):
            data = result.get("data", {})
            has_annotation = bool(data.get("annotated_image"))

        with timer.step("grade_exam.record_success"):
            manager.add_log(
                "INFO", f"Grading completed successfully for examId: {request.examId}"
            )
            manager.add_request("/grade", "POST", 200, duration, {
                "exam_id": request.examId,
                "student_id": data.get("student_id"),
                "mcq_correct": data.get("mcq_correct"),
                "written_correct": data.get("written_correct"),
                "has_annotated_image": has_annotation,
            })

        with timer.step("grade_exam.build_response"):
            response = GradingResponse(
                success=result.get("success", False),
                data=data,
                error=result.get("error"),
            )

        return response

    except Exception as e:
        duration = time.time() - start_time
        import traceback
        traceback.print_exc()
        manager.add_log("ERROR", f"Grading error: {e}")
        manager.add_request("/grade", "POST", 500, duration, {
            "examId": request.examId,
            "error": str(e),
        })
        return GradingResponse(success=False, error=f"Internal error: {str(e)}")

    finally:
        timer.report()


# =============================================================================
# ROOT ENDPOINT
# =============================================================================

@router.get("/")
async def eg_root():
    """Root endpoint for the OMR engine API."""
    return {
        "service": "OMR Engine API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "create_template": "POST /eg/template",
            "create_manual_exam": "POST /eg/exam/manual",
            "create_extraction_exam": "POST /eg/exam/extraction",
            "grade": "POST /eg/grade",
            "predict": "POST /eg/predict",
            "predict_batch": "POST /eg/predict/batch",
            "model_info": "GET /eg/model-info",
            "model_status": "GET /eg/model-status",
            "requests": "GET /eg/requests",
            "logs": "GET /eg/logs", 
            "health": "GET /eg/health",
            "ping": "GET /eg/ping",
            "websocket": "WS /eg/ws",
        },
    }