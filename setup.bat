@echo off
REM Orbitr AI Sequencer - Windows Setup Script

echo Orbitr AI Sequencer Setup
echo ==========================
echo.

REM Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

REM Check for Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Python is not installed. Please install Python 3.9+ first.
    exit /b 1
)

echo Prerequisites checked
echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
call npm install

REM Set up Python virtual environment
echo Setting up Python environment...
cd backend
python -m venv venv
call venv\Scripts\activate

REM Install Python dependencies
echo Installing Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Create cache directory
if not exist cache mkdir cache

REM Go back to root
cd ..

REM Copy environment file if it doesn't exist
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
)

echo.
echo Setup complete!
echo.
echo To start the application:
echo   npm run dev
echo.
echo Or run separately:
echo   Backend: cd backend ^&^& venv\Scripts\activate ^&^& python app.py
echo   Frontend: npm run dev:frontend
echo.
echo Open http://localhost:3000 in your browser
echo.
echo Happy sequencing!
