# Orbitr Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Technical Stack](#technical-stack)
3. [Directory Layout](#directory-layout)
4. [Component Tree](#component-tree)
5. [State Management](#state-management)
6. [Audio Engine](#audio-engine)
7. [Visualization System](#visualization-system)
8. [Backend](#backend)
9. [Data Flow](#data-flow)
10. [Security](#security)
11. [Deployment](#deployment)
12. [CI/CD](#cicd)
13. [Testing](#testing)

---

## System Overview

Orbitr is a browser-based polyphonic circular step sequencer with optional AI sample generation. It runs entirely in the browser; the Python backend is optional and only needed for real MusicGen audio generation.

```
Browser
├── Next.js 14 (App Router)
│   ├── React 18 components
│   ├── Zustand store (audioStore)
│   └── Web Audio API scheduler
│
└── (optional) FastAPI backend — port 8000
    ├── MusicGen / AudioCraft (Meta)
    └── File-system sample cache
```

### Design Principles

- **Offline-first**: Full sequencer functionality works without the backend.
- **Real-time audio**: Web Audio API with a 25 ms scheduler interval and 100 ms lookahead for sample-accurate timing.
- **Static deployable**: Builds to a fully static export for GitHub Pages via `pnpm run build:static`.

---

## Technical Stack

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS |
| UI primitives | Radix UI |
| State | Zustand 4 |
| Audio | Web Audio API (native browser) |
| Canvas | HTML5 Canvas (EnhancedSequencer visualizer) |
| Package manager | pnpm 10 |

### Backend (optional)
| Layer | Technology |
|-------|-----------|
| Server | FastAPI (Python) |
| AI model | Meta MusicGen via `transformers` |
| Rate limiting | slowapi |
| Input sanitisation | bleach, validators |
| Cache | Local filesystem (MD5-keyed WAV files) |

---

## Directory Layout

```
orbitr/
├── app/                      # Next.js App Router
│   ├── layout.tsx
│   └── page.tsx              # Renders ClientPage
├── components/               # React components
│   ├── OrbitrSequencer.tsx   # Main multi-track circular sequencer
│   ├── EnhancedSequencer.tsx # Audio-reactive Canvas visualizer
│   ├── TrackControls.tsx     # Per-track volume/mute/solo panel
│   ├── StepEditor.tsx        # Per-step gain/probability/prompt editor
│   ├── SampleLibrary.tsx     # Drag-and-drop sample management
│   ├── TransportControls.tsx # BPM, swing, reverse, master gain
│   └── GenerationQueue.tsx   # AI generation progress tracker
├── lib/
│   ├── audioStore.ts         # Zustand store — single source of truth
│   └── types.ts              # TypeScript interfaces
├── backend/
│   ├── app.py                # FastAPI application
│   ├── security_config.py
│   ├── security_middleware.py
│   ├── security_logging.py
│   └── api_key_management.py
├── tests/
│   ├── unit/                 # Jest + React Testing Library
│   └── e2e/                  # Playwright
└── .github/workflows/        # CI/CD (pnpm-based)
```

---

## Component Tree

```
page.tsx
└── ClientPage (client boundary)
    ├── OrbitrSequencer        — 4-ring SVG sequencer + step click handling
    │   └── EnhancedSequencer  — Canvas overlay with audio-reactive visuals
    ├── TrackControls          — O / R / B / I track selectors + per-track controls
    ├── StepEditor             — Active step parameters
    ├── TransportControls      — Play/stop, BPM, swing, reverse, master gain
    ├── SampleLibrary          — Loaded samples list, drag-and-drop upload
    └── GenerationQueue        — AI generation jobs with progress bars
```

---

## State Management

Single Zustand store (`lib/audioStore.ts`) owns all application state.

### Core Types (`lib/types.ts`)

```typescript
interface Step {
  id: string;
  active: boolean;
  sampleId: string | null;
  gain: number;          // 0–2
  probability: number;   // 0–1
  offset: number;        // timing offset in seconds
  prompt: string;
}

interface Track {
  id: string;
  name: string;
  steps: Step[];
  volume: number;
  muted: boolean;
  soloed: boolean;
  color: string;
  radius: number;
}

interface SampleLibraryItem {
  id: string;
  name: string;
  buffer: AudioBuffer;
  duration: number;
  type: 'generated' | 'uploaded' | 'pack';
  prompt?: string;
}

interface GenerationQueueItem {
  id: string;
  prompt: string;
  status: 'queued' | 'generating' | 'ready' | 'error';
  progress: number;
}

interface AudioState {
  tracks: Track[];
  selectedTrackId: string;
  selectedStepId: string | null;
  isPlaying: boolean;
  bpm: number;           // 40–200
  swing: number;         // 0–1
  masterGain: number;
  reverse: boolean;
  sampleLibrary: SampleLibraryItem[];
  generationQueue: GenerationQueueItem[];
  // ... actions
}
```

### Store Slices

- **Transport**: `isPlaying`, `bpm`, `swing`, `masterGain`, `reverse` + play/stop actions
- **Tracks**: 4 concentric rings (`O`, `R`, `B`, `I`), each with 16 steps + per-track controls
- **Sample Library**: loaded AudioBuffers with metadata
- **Generation Queue**: AI job tracking

---

## Audio Engine

The audio engine lives inside `OrbitrSequencer.tsx` as a component hook and drives the Web Audio API directly. The store (`audioStore.ts`) owns sequencer state (tracks, steps, BPM, etc.) but scheduling happens in the component.

### Scheduler Loop

```
setInterval (25 ms)
  └── scheduleSteps()
        for each track:
          for each step in lookahead window (100 ms):
            if step.active && Math.random() < step.probability:
              createBufferSource → gainNode → trackGainNode → masterGainNode → destination
              source.start(exactTime)
```

Key constants:
- Scheduler interval: **25 ms**
- Lookahead window: **100 ms**
- Swing: up to **30% beat offset** applied to even steps

### Audio Graph

```
AudioBufferSourceNode
  └── GainNode (step gain × track volume)
        └── GainNode (master)
              └── AudioContext.destination
```

### Track Configuration

```typescript
// 4 concentric rings, outermost to innermost
{ id: 'track1', name: 'O', radius: 180, color: '#ef4444' }  // Red
{ id: 'track2', name: 'R', radius: 150, color: '#3b82f6' }  // Blue
{ id: 'track3', name: 'B', radius: 120, color: '#10b981' }  // Green
{ id: 'track4', name: 'I', radius: 90,  color: '#f59e0b' }  // Amber
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Stop |
| `G` | Generate sample for selected step |
| `C` | Clear selected step |
| `R` | Toggle reverse |
| `1–9, 0` | Select steps 1–10 |
| `Q W E R T Y` | Select steps 11–16 |
| `← →` | Adjust BPM |

---

## Visualization System

`EnhancedSequencer.tsx` renders an HTML5 Canvas overlay on top of the SVG sequencer rings. It uses:

- **AnalyserNode** (FFT) — real-time frequency data from the master audio output
- **Spring physics** — smooth animated step indicators with configurable stiffness/damping
- **requestAnimationFrame loop** — 60 fps canvas redraws
- **Waveform ring** — circular waveform rendered at each track radius
- **Frequency bars** — radial FFT bars emanating from the center

The visualizer activates on playback start and idles when stopped.

---

## Backend

`backend/app.py` — FastAPI application, runs on port **8000**.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/generate` | Generate one sample from a text prompt |
| `POST` | `/generate_batch` | Generate multiple samples |
| `GET` | `/cache/size` | Report cache size |
| `DELETE` | `/cache/clear` | Clear the sample cache (destructive) |

### Generation Flow

```
POST /generate { prompt, duration, quality }
  ├── Check MD5 cache key → return cached WAV if hit
  ├── Load MusicGen model (small for draft, melody for HQ)
  ├── Generate audio tensor (ThreadPoolExecutor)
  ├── Encode as WAV → base64
  ├── Write to file-system cache
  └── Return { audio: "<base64>", cached: false }
```

Model selection: `melody` model for draft quality, `musicgen` (small) for HQ. Falls back to synthetic sine-wave audio if `transformers` / CUDA is unavailable (useful for local dev without a GPU).

### Security Modules

- `security_config.py` — CSP headers, allowed origins
- `security_middleware.py` — request validation middleware
- `security_logging.py` — structured audit logging
- `api_key_management.py` — optional API key gating

---

## Data Flow

### Playback

```
User clicks Play
  → audioStore.startPlayback()
      → AudioContext.resume()
      → schedulerTimerRef = setInterval(scheduleSteps, 25)

scheduleSteps() every 25 ms
  → for each track's active steps in next 100 ms:
      → AudioBufferSourceNode.start(scheduledTime)

User clicks Stop
  → clearInterval(schedulerTimerRef)
  → AudioContext.suspend()
```

### AI Sample Generation

```
User enters prompt → clicks Generate
  → audioStore.generateSample(prompt, quality)
      → Add GenerationQueueItem { status: 'pending' }
      → POST /generate to FastAPI backend
          → (cache hit)  return base64 WAV immediately
          → (cache miss) run MusicGen, encode, cache, return
      → decodeAudioData(base64) → AudioBuffer
      → Add SampleLibraryItem to store
      → Assign to selected step
      → Update GenerationQueueItem { status: 'complete' }
```

### File Upload

```
User drags audio file onto SampleLibrary
  → FileReader.readAsArrayBuffer()
  → AudioContext.decodeAudioData()
  → Add SampleLibraryItem { type: 'uploaded' }
```

---

## Security

The backend applies:
- **Rate limiting** via slowapi (per-IP, configurable)
- **Input sanitisation** via bleach for all text prompts
- **URL validation** via validators
- **CORS** restricted to configured origins
- **CSP headers** via security_config.py

The frontend has no authentication layer; the backend is intended to run locally or behind a trusted reverse proxy.

---

## Deployment

### Static (GitHub Pages) — no backend

```bash
pnpm run build:static   # next build + next export
```

All features work except real MusicGen generation. Sample packs use pre-synthesised audio.

### Full-stack

```bash
# Frontend
pnpm run build && pnpm start   # port 3000

# Backend
cd backend && python app.py    # port 8000
```

### Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000   # backend URL
NEXT_PUBLIC_STATIC_MODE=false              # set true for static export

# Backend
CACHE_DIR=./cache
MAX_CACHE_SIZE_MB=500
```

---

## CI/CD

Three GitHub Actions workflows, all pnpm-based:

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `ci.yml` | push / PR | lint, type-check, unit tests, Lighthouse |
| `deploy.yml` | push to main | build:static → GitHub Pages |
| `comprehensive-testing.yml` | push / PR | frontend tests, E2E, perf, security scan |

All workflows use `pnpm/action-setup@v4` + `pnpm install --frozen-lockfile`.

---

## Testing

```
tests/
├── unit/
│   ├── audioStore.test.ts     # Zustand store — 81 tests
│   └── components/            # React Testing Library component tests
└── e2e/
    └── sequencer.spec.ts      # Playwright end-to-end tests
```

| Command | Description |
|---------|-------------|
| `pnpm test` | Unit tests (Jest) |
| `pnpm run test:watch` | Unit tests in watch mode |
| `pnpm run test:coverage` | Coverage report |
| `pnpm run test:e2e` | Playwright E2E (requires dev server) |
