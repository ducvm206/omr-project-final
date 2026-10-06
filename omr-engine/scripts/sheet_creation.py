# omr-engine/scripts/sheet_creation.py
"""
Sheet Creation Script - Command line interface for generating answer sheets.

This script provides a CLI for generating OMR answer sheet PDFs with template extraction.

Usage:
    python scripts/sheet_creation.py --name "Math Exam" --mcq 40 --written 4 --has-key --has-student-id --debug
    
    python scripts/sheet_creation.py --name "Quiz" --mcq 20 --written 0 --has-key
    
    python scripts/sheet_creation.py --help
"""

import os
import sys
import json
import argparse
import re
import base64
import warnings
from typing import Optional, Tuple, Dict, Any
from datetime import datetime
from io import BytesIO

warnings.filterwarnings("ignore", category=DeprecationWarning)

# =============================================================================
# Add project root to Python path for absolute imports
# =============================================================================

# Get the directory of this script
script_dir = os.path.dirname(os.path.abspath(__file__))
# Get the project root (omr-engine)
project_root = os.path.dirname(script_dir)
# Add project root to Python path
sys.path.insert(0, project_root)

# Now use absolute imports
from core.template.config import SheetConfig, ExtractionConfig
from core.template.sheet_pdf_generator import SheetGenerator
from core.template.json_extractor import JSONTemplateExtractor


# =============================================================================
# CLI CONSTANTS
# =============================================================================

class CliVariable:
    """CLI variable constants."""
    DEBUG_MODE = "--debug"
    TEMPLATE_NAME = "--name"
    TEMPLATE_MCQ = "--mcq"
    TEMPLATE_WRITTEN = "--written"
    TEMPLATE_HAS_KEY = "--has-key"
    TEMPLATE_HAS_STUDENT_ID = "--has-student-id"
    QUIET = "--quiet"


# =============================================================================
# SHEET CREATION CLI
# =============================================================================

class SheetCreationCLI:
    """
    CLI handler for sheet creation and extraction.
    Generates answer sheet PDF and extracts template data.
    """
    
    def __init__(self):
        """Initialize the CLI handler."""
        # No files_root needed - everything is in-memory
        self.generator = SheetGenerator(".")  # Dummy path, not used for file saving
        self.extractor = JSONTemplateExtractor(".")  # Dummy path, not used for file saving
    
    def generate_sheet(
        self,
        name: str = "Untitled Sheet",
        mcq: int = 40,
        written: int = 0,
        has_key: bool = False,
        has_student_id: bool = False,
        debug: bool = False
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Generate an answer sheet and extract template data.
        
        Returns:
            Tuple of (success, response_dict)
            Response dict contains: {"template_data": ..., "file_base64": ...}
        """
        try:
            # Step 1: Create configuration
            config = SheetConfig(
                name=name,
                num_mcq_questions=mcq,
                num_written_questions=written,
                include_student_id=has_student_id,
                include_key=has_key
            )
            
            # Validate configuration
            valid, error = config.validate()
            if not valid:
                return False, {"error": f"Config validation failed: {error}"}
            
            # Step 2: Set up extraction config
            extraction_config = ExtractionConfig(
                dpi=300,
                show_visualization=debug,
                keep_png=debug
            )
            
            # Step 3: Generate PDF to memory (no file)
            # The generator returns PDF bytes when output_path is None
            generator = SheetGenerator(".")
            generator = SheetGenerator(".")
            
            # Create a designer and generate directly
            from core.template.sheet_pdf_generator import AnswerSheetDesigner
            
            designer = AnswerSheetDesigner()
            designer.set_config(
                include_student_id=config.include_student_id,
                include_key=config.include_key,
                include_written_boxes=(config.num_written_questions > 0),
                written_boxes=config.num_written_questions
            )
            
            pdf_bytes = designer.create_answer_sheet(
                config.num_mcq_questions,
                output_path=None,  # No file - returns bytes
                format='pdf',
                written_boxes=config.num_written_questions
            )
            
            if not pdf_bytes:
                return False, {"error": "PDF generation failed"}
            
            # Step 4: Extract template from the PDF bytes
            # Save to temp file for extraction
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
                tmp.write(pdf_bytes)
                tmp_path = tmp.name
            
            try:
                extract_success, extract_error, template_data = self.extractor.extract(
                    tmp_path, extraction_config
                )
                
                if not extract_success:
                    return False, {"error": f"Template extraction failed: {extract_error}"}
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            
            # Step 5: Build response - only template_data and file_base64
            response = {
                "template_data": template_data,
                "file_base64": base64.b64encode(pdf_bytes).decode('utf-8') if pdf_bytes else ""
            }
            
            return True, response
            
        except Exception as e:
            return False, {"error": str(e)}
    
    def extract_from_pdf(
        self,
        pdf_path: str,
        debug: bool = False
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Extract template data from an existing PDF file.
        
        Returns:
            Tuple of (success, response_dict)
            Response dict contains: {"template_data": ..., "file_base64": ...}
        """
        try:
            if not os.path.exists(pdf_path):
                return False, {"error": f"PDF file not found: {pdf_path}"}
            
            extraction_config = ExtractionConfig(
                dpi=300,
                show_visualization=debug,
                keep_png=debug
            )
            
            success, error, template_data = self.extractor.extract(
                pdf_path, extraction_config
            )
            
            if not success:
                return False, {"error": f"Extraction failed: {error}"}
            
            # Read PDF bytes
            with open(pdf_path, 'rb') as f:
                pdf_bytes = f.read()
            
            # Build response - only template_data and file_base64
            response = {
                "template_data": template_data,
                "file_base64": base64.b64encode(pdf_bytes).decode('utf-8') if pdf_bytes else ""
            }
            
            return True, response
            
        except Exception as e:
            return False, {"error": str(e)}
    
    def extract_from_bytes(
        self,
        pdf_bytes: bytes,
        debug: bool = False
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Extract template data from PDF bytes.
        
        Returns:
            Tuple of (success, response_dict)
            Response dict contains: {"template_data": ..., "file_base64": ...}
        """
        try:
            if not pdf_bytes:
                return False, {"error": "No PDF bytes provided"}
            
            extraction_config = ExtractionConfig(
                dpi=300,
                show_visualization=debug,
                keep_png=debug
            )
            
            # Save to temp file for extraction
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
                tmp.write(pdf_bytes)
                tmp_path = tmp.name
            
            try:
                success, error, template_data = self.extractor.extract(
                    tmp_path, extraction_config
                )
                
                if not success:
                    return False, {"error": f"Extraction failed: {error}"}
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            
            # Build response - only template_data and file_base64
            response = {
                "template_data": template_data,
                "file_base64": base64.b64encode(pdf_bytes).decode('utf-8') if pdf_bytes else ""
            }
            
            return True, response
            
        except Exception as e:
            return False, {"error": str(e)}


# =============================================================================
# ARGUMENT PARSING
# =============================================================================

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Generate OMR answer sheet PDF and extract template data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate with default settings
  python scripts/sheet_creation.py --name "Math Exam" --mcq 40 --written 4

  # Generate with answer key and student ID
  python scripts/sheet_creation.py --name "Final Exam" --mcq 40 --has-key --has-student-id

  # Extract from existing PDF
  python scripts/sheet_creation.py --extract template.pdf

  # Enable debug mode
  python scripts/sheet_creation.py --name "Debug Sheet" --mcq 20 --debug

  # Quiet mode (minimal output)
  python scripts/sheet_creation.py --name "Silent" --mcq 30 --quiet

Flags:
  --name          Template/sheet name
  --mcq           Number of MCQ questions (0-40)
  --written       Number of written questions (0-20)
  --has-key       Include answer key section
  --has-student-id Include student ID section
  --debug         Enable debug mode
  --extract       Extract template from existing PDF
  --quiet         Suppress non-essential output
        """
    )
    
    # Template creation flags
    parser.add_argument(
        CliVariable.TEMPLATE_NAME,
        type=str,
        default="Untitled Sheet",
        help="Name/title of the template (default: 'Untitled Sheet')"
    )
    
    parser.add_argument(
        CliVariable.TEMPLATE_MCQ,
        type=int,
        default=40,
        choices=range(0, 41),
        help="Number of MCQ questions (0-40, default: 40)"
    )
    
    parser.add_argument(
        CliVariable.TEMPLATE_WRITTEN,
        type=int,
        default=0,
        choices=range(0, 21),
        help="Number of written questions (0-20, default: 0)"
    )
    
    parser.add_argument(
        CliVariable.TEMPLATE_HAS_KEY,
        action='store_true',
        default=False,
        help="Include answer key section (default: False)"
    )
    
    parser.add_argument(
        CliVariable.TEMPLATE_HAS_STUDENT_ID,
        action='store_true',
        default=False,
        help="Include student ID section (default: False)"
    )
    
    # Extract mode
    parser.add_argument(
        "--extract",
        type=str,
        default=None,
        help="Extract template from existing PDF file instead of generating"
    )
    
    # Debug mode
    parser.add_argument(
        CliVariable.DEBUG_MODE,
        action='store_true',
        help="Enable debug mode (show visualizations, keep temporary files)"
    )
    
    # Quiet mode
    parser.add_argument(
        CliVariable.QUIET,
        action='store_true',
        help="Suppress non-essential output"
    )
    
    return parser.parse_args()


# =============================================================================
# OUTPUT HELPERS
# =============================================================================

def print_output(response: Dict[str, Any], quiet: bool = False):
    """
    Print the response output.
    
    Args:
        response: Response dictionary
        quiet: Suppress non-essential output
    """
    # Print to stderr for non-JSON output
    if not quiet:
        if "error" not in response:
            print(f"✅ Success!", file=sys.stderr)
            # Print summary of extracted data
            template_data = response.get("template_data", {})
            mcq_count = len(template_data.get('mcq', {}).get('questions', [])) if template_data else 0
            has_student_id = bool(template_data.get('student_id')) if template_data else False
            has_key = bool(template_data.get('key')) if template_data else False
            written_count = len(template_data.get('written_answers', {}).get('answer_boxes', [])) if template_data and template_data.get('written_answers') else 0
            
            print(f"   MCQ Questions: {mcq_count}", file=sys.stderr)
            print(f"   Written Questions: {written_count}", file=sys.stderr)
            print(f"   Student ID: {'Yes' if has_student_id else 'No'}", file=sys.stderr)
            print(f"   Answer Key: {'Yes' if has_key else 'No'}", file=sys.stderr)
            
            # Print base64 length
            file_base64 = response.get("file_base64", "")
            print(f"   Base64 Length: {len(file_base64)} chars", file=sys.stderr)
        else:
            print(f"❌ Error: {response.get('error', 'Unknown error')}", file=sys.stderr)
    
    # Print JSON to stdout (only template_data and file_base64)
    json_output = json.dumps(response, indent=2, default=str)
    print(json_output)


# =============================================================================
# MAIN
# =============================================================================

def main():
    """Main entry point."""
    args = parse_arguments()
    
    cli = SheetCreationCLI()
    
    # Handle extract mode
    if args.extract:
        success, response = cli.extract_from_pdf(
            pdf_path=args.extract,
            debug=args.debug
        )
        print_output(response, quiet=args.quiet)
        sys.exit(0 if success else 1)
    
    # Handle generate mode
    success, response = cli.generate_sheet(
        name=args.name,
        mcq=args.mcq,
        written=args.written,
        has_key=args.has_key,
        has_student_id=args.has_student_id,
        debug=args.debug
    )
    
    print_output(response, quiet=args.quiet)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()