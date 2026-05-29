# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This repo uses **pnpm** (`packageManager: pnpm@10.30.0`, requires Node >=18). Use `pnpm`, not `npm` — the composite scripts (`dev`, `deploy:pages`) call `pnpm` internally.

### Frontend (Next.js)
- `pnpm run dev:frontend` - Start frontend dev server on localhost:3000
- `pnpm run build` - Production build
- `pnpm run build:static` / `pnpm run deploy:pages` - Static export for GitHub Pages (`NEXT_EXPORT=true`, outputs to `out/`)
- `pnpm run lint` (`lint:fix`) - ESLint
- `pnpm run type-check` - `tsc --noEmit` (TypeScript only; not part of `lint`)
- `pnpm run format` (`format:check`) - Prettier

### Backend (Python FastAPI)
- `pnpm run dev:backend` - Start backend on localhost:8000 (runs `cd backend && python app.py`)
- `cd backend && pip install -r requirements.txt` - Install deps (or `requirements-minimal.txt` to skip AI/torch and run in fake-audio mode)

### Full Stack Development
- `pnpm run dev` - Run frontend + backend concurrently (recommended)

### Tests
- `pnpm test` - Jest unit/integration tests (jsdom). Single file: `pnpm test __tests__/lib/audioStore.test.ts`; single test: `pnpm test -t "test name"`
- `pnpm run test:watch` / `pnpm run test:coverage`
- `pnpm run test:e2e` - Playwright E2E (`test:e2e:ui`, `:headed`, `:debug` variants)
- `cd backend && pytest` - Backend tests. Single file: `pytest test_app.py`; single test: `pytest test_app.py::test_name`

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
- **FastAPI** server with MusicGen/AudioCraft integration (`backend/app.py`)
- **AI Models**: Facebook's MusicGen via Transformers (small for draft, melody for HQ), lazy-loaded on first request. If `torch`/`torchaudio` aren't importable, the backend falls back to generating fake audio — useful for testing without the heavy AI stack.
- **Caching**: File-based cache with MD5 keys for generated samples
- **Endpoints** (auth-protected via bearer token — see Security layer below):
  - `POST /generate` - Generate single audio sample from text prompt
  - `POST /generate_batch` - Generate multiple samples (lower rate limit)
  - `GET /cache/size` - Cache stats
  - `DELETE /cache/clear` - Clear cache (destructive; tight rate limit)
  - `GET /health` - Health/config status; `GET /security/metrics` - security telemetry

### Backend Security layer
The backend is wrapped in a custom security stack — when changing endpoints or auth, touch these together:
- `security_config.py` - Central config singleton driven by env vars (`API_KEY`, `GENERATION_RATE_LIMIT`, `MAX_PROMPT_LENGTH`, `MAX_CONCURRENT_GENERATIONS`, `ENVIRONMENT`, etc.). Initialized at module import — see the testing gotcha below.
- `security_middleware.py` - `SecurityMiddleware`, `AuthenticationMiddleware`, `RateLimitMiddleware`
- `security_logging.py` - structured security event logging (`backend/security.log`)
- `api_key_management.py` - API key lifecycle / expiry
- Rate limiting uses `slowapi`; inputs sanitized with `bleach`/`validators`. In `development` env auth is relaxed; `production` enforces bearer tokens and `TrustedHostMiddleware`.

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
- **Frontend**: Jest + React Testing Library. Path aliases (`@/components`, `@/lib`, `@/app`) are mapped in `jest.config.js`. Suites live in `__tests__/` (components, lib, integration, performance) plus `tests/` for E2E.
- **Backend**: pytest + FastAPI TestClient (`backend/test_app.py`, `test_security.py`). **Gotcha:** `security_config` is a module-level singleton built when `app.py` is first imported, so any env var that must influence it has to be set *before* that import — `backend/conftest.py` does this (and resets the rate limiter between tests). Don't move those assignments into individual tests.
- **E2E**: Playwright (`playwright.config.ts`).
- **CI/CD**: GitHub Actions with automated testing and build verification. GitHub Pages deploy uses the static export (`deploy:pages`).

### Component Note
`OrbitrSequencer.tsx` is the active sequencer mounted by `app/page.tsx`. `EnhancedSequencer.tsx` is an alternate/experimental variant — confirm which is wired up before editing sequencer behavior.