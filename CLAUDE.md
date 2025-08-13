# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (Next.js)
- `npm run dev:frontend` - Start frontend development server on localhost:3000
- `npm run build` - Build the Next.js application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

### Backend (Python FastAPI)
- `npm run dev:backend` - Start Python backend server on localhost:8000
- `cd backend && python app.py` - Start backend directly
- `cd backend && pip install -r requirements.txt` - Install Python dependencies

### Full Stack Development
- `npm run dev` - Start both frontend and backend concurrently (recommended)

### Docker
- `docker-compose up` - Run the full application stack in containers

## Project Architecture

### Frontend Structure
- **Next.js 14** with React 18, TypeScript, and Tailwind CSS
- **State Management**: Zustand store (`lib/audioStore.ts`) manages sequencer state, sample library, and generation queue
- **Audio Processing**: Web Audio API for real-time audio scheduling with precise timing
- **Components**:
  - `OrbitrSequencer.tsx` - Main circular sequencer with 16-step pattern, playhead animation, and Web Audio scheduling
  - `StepEditor.tsx` - Per-step controls (gain, probability, AI prompts)
  - `SampleLibrary.tsx` - Sample management with drag-and-drop support
  - `TransportControls.tsx` - BPM, swing, reverse, and master gain controls
  - `GenerationQueue.tsx` - AI generation status and progress tracking

### Backend Architecture
- **FastAPI** server with MusicGen/AudioCraft integration
- **AI Models**: Uses Facebook's MusicGen models (small for draft, melody for HQ)
- **Caching**: File-based cache with MD5 keys for generated samples
- **Generation**: Supports both real MusicGen and fake audio for testing
- **Endpoints**:
  - `POST /generate` - Generate single audio sample from text prompt
  - `POST /generate_batch` - Generate multiple samples
  - `GET /cache/size` and `GET /cache/clear` - Cache management

### Key Technical Details
- **Audio Scheduling**: Uses Web Audio API with 0.1s lookahead for tight timing
- **Sequencer Pattern**: 16-step circular layout with probability-based triggering
- **Sample Format**: Base64-encoded WAV files for transport between frontend/backend
- **State Synchronization**: Zustand manages complex state including audio buffers, generation queue, and library

### Audio Engine Implementation
- Real-time audio scheduling with swing support (up to 30% offset)
- Per-step gain and probability controls
- Reverse playback capability
- Master gain control with WebAudio gain nodes
- AudioBuffer management for sample playback

### AI Generation Workflow
1. Check cache for existing sample using MD5 key of generation parameters
2. Add generation request to queue with progress tracking
3. Call FastAPI backend with prompt and parameters
4. Decode base64 audio response to AudioBuffer
5. Add to sample library and optionally assign to step
6. Cache result for future use

## Development Notes

### Audio Context
- Audio context is lazily initialized on first user interaction
- Uses proper suspend/resume for browser audio policy compliance
- Proper cleanup of audio nodes and scheduled sources

### File Handling
- Drag-and-drop support for local audio files
- Automatic audio file decoding to AudioBuffer
- Sample library management with metadata (duration, type, prompt)

### Performance Considerations
- Uses requestAnimationFrame for smooth playhead animation
- Background generation with progress tracking
- Intelligent caching to avoid regenerating identical samples
- Concurrent generation support with staggered requests

### Backend Dependencies
- Requires AudioCraft for real AI generation (falls back to fake audio if not installed)
- CUDA support recommended for faster generation
- ThreadPoolExecutor for CPU-bound operations