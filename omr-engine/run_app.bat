@echo off
echo ========================================
echo   Starting FastAPI Application
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python and add it to your PATH.
    pause
    exit /b 1
)

REM Activate virtual environment if it exists
if exist ".venv\Scripts\activate" (
    echo Activating virtual environment...
    call .venv\Scripts\activate
) else if exist "venv\Scripts\activate" (
    echo Activating virtual environment...
    call venv\Scripts\activate
) else if exist "env\Scripts\activate" (
    echo Activating virtual environment...
    call env\Scripts\activate
) else (
    echo No virtual environment found. Using system Python.
)

echo.
echo Starting server...
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Run the FastAPI application - this will block until the server stops
python -m app.app

REM This line only runs after the server stops
echo.
echo Server has stopped.
pause