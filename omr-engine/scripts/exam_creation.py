# scripts/exam_creation.py
"""
Unified Exam Creation Script - Handles both manual and extraction exam creation.
Takes JSON input and returns JSON output.
"""

import os
import sys
import json
import base64
from typing import Optional, Dict, Any, Tuple
from datetime import datetime
from pathlib import Path

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from core.exam.manual_exam_creator import process_manual_exam
from core.exam.extraction_exam_creator import process_extraction_exam


def log(msg):
    """Log to stderr to avoid interfering with JSON output."""
    print(f"[ExamCreation] {msg}", file=sys.stderr)


def create_exam(input_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Unified exam creation entry point.
    
    Input format:
    {
        "mode": "manual" | "extraction",
        "exam_config": {
            "mode": "manual" | "extraction",
            "name": "Math Final Exam",
            "templateId": "TEMP-001",
            "numberOfKeys": "5",
            // For manual mode:
            "keyA": {"1": ["A"], "2": ["B"], "41": 3.5},
            "keyB": {"1": ["B"], "2": ["A"], "41": 4.0},
            ...
            // For extraction mode:
            "keyAFile": {"bytes": "base64_encoded_data"},
            "keyBFile": {"bytes": "base64_encoded_data"},
            ...
        }
    }
    
    Returns:
    {
        "success": true,
        "error": null,
        "exam_data": {
            "mode": "manual" | "extraction",
            "name": "...",
            "templateId": "...",
            "numberOfKeys": "...",
            "keys": {...},
            "mcq_count": 40,
            "written_count": 4,
            "created_at": "..."
        }
    }
    """
    try:
        # Validate input
        if not input_json:
            return {
                "success": False,
                "error": "Empty input",
                "exam_data": None
            }
        
        # Get mode and exam_config
        mode = input_json.get('mode', 'manual')
        exam_config = input_json.get('exam_config', {})
        
        # If exam_config is empty, use the entire input as exam_config
        if not exam_config:
            exam_config = input_json
        
        # Validate exam_config
        if not exam_config.get('name'):
            return {
                "success": False,
                "error": "Exam name is required",
                "exam_data": None
            }
        
        if not exam_config.get('templateId'):
            return {
                "success": False,
                "error": "Template ID is required",
                "exam_data": None
            }
        
        log(f"Creating exam in mode: {mode}")
        log(f"  Name: {exam_config.get('name')}")
        log(f"  Template ID: {exam_config.get('templateId')}")
        log(f"  Number of Keys: {exam_config.get('numberOfKeys', '5')}")
        
        # Route to appropriate creator
        if mode == 'manual':
            log("Using manual exam creator...")
            result = process_manual_exam(exam_config)
            return result
        elif mode == 'extraction':
            log("Using extraction exam creator...")
            result = process_extraction_exam(exam_config)
            return result
        else:
            return {
                "success": False,
                "error": f"Invalid mode: {mode}. Must be 'manual' or 'extraction'",
                "exam_data": None
            }
            
    except Exception as e:
        import traceback
        log(f"Error: {e}")
        traceback.print_exc(file=sys.stderr)
        return {
            "success": False,
            "error": str(e),
            "exam_data": None
        }


# =============================================================================
# COMMAND LINE INTERFACE
# =============================================================================

def main():
    """Command line entry point."""
    try:
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())
        result = create_exam(input_data)
        print(json.dumps(result, indent=2, default=str))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Invalid JSON input: {e}",
            "exam_data": None
        }, indent=2))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "exam_data": None
        }, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()