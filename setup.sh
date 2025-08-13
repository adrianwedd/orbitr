#!/bin/bash

# Orbitr AI Sequencer - Quick Setup Script

echo "🎵 Orbitr AI Sequencer Setup"
echo "============================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9+ first."
    exit 1
fi

echo "✅ Prerequisites checked"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Set up Python virtual environment
echo "🐍 Setting up Python environment..."
cd backend
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create cache directory
mkdir -p cache

# Go back to root
cd ..

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "To start the application:"
echo "  npm run dev"
echo ""
echo "Or run separately:"
echo "  Backend: cd backend && source venv/bin/activate && python app.py"
echo "  Frontend: npm run dev:frontend"
echo ""
echo "Open http://localhost:3000 in your browser"
echo ""
echo "🎹 Happy sequencing!"
