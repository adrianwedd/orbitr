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
- **State Management**: Multi-track Zustand store (`lib/audioStore.ts`) manages 4 concentric tracks, sample library, and generation queue
- **Audio Processing**: Polyphonic Web Audio API scheduling with independent gain chains per track
- **Components**:
  - `OrbitrSequencer.tsx` - Multi-track circular sequencer with 4 concentric rings (O-R-B-I), visual track selection, and polyphonic playback
  - `TrackControls.tsx` - Vertical ORBITR track selector with volume, mute, solo controls
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
- **Multi-Track Audio**: 4 concentric tracks with polyphonic playback, independent volume/mute/solo controls
- **Audio Scheduling**: Uses Web Audio API with 0.1s lookahead for precise polyphonic timing
- **Sequencer Pattern**: 16-step circular layout per track with probability-based triggering
- **Sample Format**: Base64-encoded WAV files for transport between frontend/backend
- **State Synchronization**: Multi-track Zustand store manages complex state including track data, audio buffers, generation queue, and library
- **AI Sample Packs**: 5 curated packs (Lo-Fi, Techno, Trap, House, Ambient) with strategic multi-track placement

### Audio Engine Implementation
- **Polyphonic playback**: All tracks play simultaneously with independent gain chains
- **Real-time scheduling**: Web Audio API with swing support (up to 30% offset)
- **Track controls**: Per-track volume, mute, solo with proper audio routing
- **Per-step controls**: Gain and probability controls per step
- **Reverse playback**: Capability across all tracks
- **Master gain**: Control with WebAudio gain nodes
- **AudioBuffer management**: Efficient sample playback across multiple tracks

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
- Uses MusicGen via Transformers library for real AI generation (falls back to fake audio if not installed)
- CUDA support recommended for faster generation  
- ThreadPoolExecutor for CPU-bound operations
- File-based caching with MD5 keys for instant sample recall

## Multi-Track Architecture

### Track Configuration
```typescript
// 4 concentric tracks with different radii and colors
const tracks = [
  createTrack('track1', 'O', 180, '#ef4444'), // Red - Outer ring
  createTrack('track2', 'R', 150, '#3b82f6'), // Blue
  createTrack('track3', 'B', 120, '#10b981'), // Green  
  createTrack('track4', 'I', 90,  '#f59e0b'), // Yellow - Inner ring
];
```

### Keyboard Shortcuts
- `Space` - Play/Stop
- `G` - Generate sample for selected step
- `C` - Clear selected step
- `R` - Toggle reverse
- `1-9, 0, Q-Y` - Select steps 1-16
- `← →` - Adjust BPM

### Testing Infrastructure
- **Frontend**: Jest + React Testing Library with comprehensive audioStore tests
- **Backend**: pytest + FastAPI TestClient with API endpoint coverage
- **CI/CD**: GitHub Actions with automated testing and build verification