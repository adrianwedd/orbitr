# Orbitr Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Concepts](#core-concepts)
3. [Technical Stack](#technical-stack)
4. [Application Architecture](#application-architecture)
5. [Audio Engine Design](#audio-engine-design)
6. [State Management](#state-management)
7. [Component Hierarchy](#component-hierarchy)
8. [Data Flow](#data-flow)
9. [Performance Considerations](#performance-considerations)
10. [Security Architecture](#security-architecture)
11. [Deployment Architecture](#deployment-architecture)
12. [Future Considerations](#future-considerations)

---

## System Overview

Orbitr is a web-based polyphonic circular step sequencer with AI-powered sample generation. The system consists of three main components:

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser (Client)                      │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                   React Application                   │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │    │
│  │  │ UI Components│  │ Audio Engine │  │State Mgmt │ │    │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                               │
                               │ HTTP/WebSocket
                               │
┌──────────────────────────────────────────────────────────────┐
│                      Backend Services                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  FastAPI     │  │   MusicGen   │  │    Cache     │      │
│  │  Server      │  │   Models     │  │    Layer     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Real-time Performance**: Audio scheduling must be sample-accurate with <10ms latency
2. **Offline-First**: Core functionality works without backend connection
3. **Progressive Enhancement**: Features scale based on device capabilities
4. **Modular Architecture**: Components are loosely coupled and independently testable
5. **Accessibility**: Full keyboard navigation and screen reader support

---

## Core Concepts

### Musical Structure

```
Pattern
├── Track[] (Concentric rings, 4-8 tracks)
│   ├── Steps[] (16 steps per track)
│   │   ├── active: boolean
│   │   ├── sample: AudioBuffer | null
│   │   ├── velocity: 0-127
│   │   ├── probability: 0-1
│   │   ├── timing: -50ms to +50ms
│   │   └── effects: EffectChain
│   ├── volume: 0-1
│   ├── pan: -1 to 1
│   ├── mute: boolean
│   ├── solo: boolean
│   └── color: hex
└── Global
    ├── bpm: 40-200
    ├── swing: 0-100%
    ├── length: 1-64 steps
    └── timeSignature: 4/4, 3/4, etc.
```

### Playback Model

The sequencer uses a **look-ahead scheduling** model:

1. **Clock Source**: High-resolution Web Audio clock
2. **Scheduler**: Runs every 25ms, schedules 100ms ahead
3. **Event Queue**: Buffered events for precise timing
4. **Polyphony**: Up to 8 tracks × 16 steps = 128 potential voices

---

## Technical Stack

### Frontend
```yaml
Core:
  - Next.js 14: React framework with SSR/SSG
  - React 18: UI library with concurrent features
  - TypeScript 5: Type safety and developer experience

State Management:
  - Zustand 4: Lightweight state management
  - Immer: Immutable state updates
  - React Query: Server state management

Audio:
  - Web Audio API: Low-level audio processing
  - Tone.js (optional): Audio effects and utilities
  - WaveSurfer.js: Waveform visualization

UI/UX:
  - Tailwind CSS: Utility-first styling
  - Framer Motion: Animations
  - Radix UI: Accessible components
  - React DnD Kit: Drag and drop

Build Tools:
  - Webpack 5: Module bundling
  - SWC: Fast TypeScript compilation
  - PostCSS: CSS processing
```

### Backend
```yaml
Core:
  - Python 3.10+: Runtime
  - FastAPI: Async web framework
  - Uvicorn: ASGI server

AI/ML:
  - AudioCraft: Meta's audio generation
  - MusicGen: Music generation models
  - PyTorch: Deep learning framework
  - Transformers: Model management

Audio Processing:
  - librosa: Audio analysis
  - scipy: Signal processing
  - numpy: Numerical operations

Infrastructure:
  - Redis: Caching and queues
  - Celery: Task queue for generation
  - MinIO/S3: Sample storage
  - PostgreSQL: Metadata storage
```

---

## Application Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│         (React Components, UI State, Animations)         │
├─────────────────────────────────────────────────────────┤
│                    Application Layer                     │
│        (Business Logic, Audio Engine, Sequencer)         │
├─────────────────────────────────────────────────────────┤
│                      Domain Layer                        │
│        (Core Models, Musical Concepts, Rules)            │
├─────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                    │
│         (API Clients, Storage, External Services)        │
└─────────────────────────────────────────────────────────┘
```

### Module Structure

```
src/
├── components/           # UI Components
│   ├── sequencer/       # Sequencer-specific components
│   │   ├── TrackRing.tsx
│   │   ├── StepButton.tsx
│   │   ├── Playhead.tsx
│   │   └── TrackControls.tsx
│   ├── controls/        # Control components
│   │   ├── Knob.tsx
│   │   ├── Fader.tsx
│   │   └── Transport.tsx
│   └── shared/          # Reusable components
│
├── lib/                 # Core libraries
│   ├── audio/          # Audio engine
│   │   ├── engine.ts
│   │   ├── scheduler.ts
│   │   ├── effects.ts
│   │   └── analysis.ts
│   ├── sequencer/      # Sequencer logic
│   │   ├── pattern.ts
│   │   ├── track.ts
│   │   └── step.ts
│   └── ai/             # AI integration
│       ├── generation.ts
│       └── prompts.ts
│
├── stores/             # State management
│   ├── sequencer.ts
│   ├── audio.ts
│   ├── ui.ts
│   └── settings.ts
│
├── hooks/              # Custom React hooks
│   ├── useAudioEngine.ts
│   ├── useKeyboardShortcuts.ts
│   └── useGenerateAudio.ts
│
├── services/           # External services
│   ├── api.ts
│   ├── storage.ts
│   └── analytics.ts
│
└── utils/              # Utilities
    ├── music.ts        # Musical calculations
    ├── audio.ts        # Audio utilities
    └── format.ts       # Data formatting
```

---

## Audio Engine Design

### Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     Audio Context                         │
│                                                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │  Track 1   │  │  Track 2   │  │  Track N   │        │
│  │  └─Gain    │  │  └─Gain    │  │  └─Gain    │        │
│  │    └─Pan   │  │    └─Pan   │  │    └─Pan   │        │
│  │      └─FX  │  │      └─FX  │  │      └─FX  │        │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘        │
│         │                │                │               │
│         └────────────────┴────────────────┘               │
│                          │                                │
│                    ┌─────▼─────┐                         │
│                    │  Master   │                         │
│                    │   └─Gain  │                         │
│                    │     └─Comp│                         │
│                    │       └─Lim│                         │
│                    └─────┬─────┘                         │
│                          │                                │
│                    ┌─────▼─────┐                         │
│                    │Destination│                         │
│                    └───────────┘                         │
└──────────────────────────────────────────────────────────┘
```

### Scheduling System

```typescript
class AudioScheduler {
  private lookahead = 100.0;        // ms
  private scheduleInterval = 25.0;  // ms
  private nextNoteTime = 0.0;       // Audio context time
  private currentStep = 0;          // Current sequencer position
  
  private scheduler() {
    // Schedule all notes that fall within lookahead window
    while (this.nextNoteTime < this.audioContext.currentTime + this.lookahead) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }
  }
  
  private scheduleStep(step: number, time: number) {
    // For each track
    tracks.forEach(track => {
      const stepData = track.steps[step];
      if (stepData.active && stepData.sample) {
        this.scheduleNote(track, stepData, time);
      }
    });
  }
}
```

### Voice Architecture

Each voice (playing sample) has this signal chain:

```
AudioBufferSourceNode
    │
    ├─► GainNode (velocity)
    │
    ├─► StereoPannerNode
    │
    ├─► FilterNode (optional)
    │
    ├─► WaveShaperNode (optional distortion)
    │
    ├─► DelayNode (optional)
    │
    └─► Track Output
```

### Performance Optimizations

1. **Object Pooling**: Reuse audio nodes to reduce GC pressure
2. **Buffer Caching**: Keep frequently used samples in memory
3. **Lazy Loading**: Load samples on-demand with prefetching
4. **Web Workers**: Offload waveform analysis and non-critical processing

---

## State Management

### Store Architecture

```typescript
// Root store combining all slices
interface OrbitrStore {
  // Sequencer state
  sequencer: SequencerSlice;
  
  // Audio engine state
  audio: AudioSlice;
  
  // UI state
  ui: UISlice;
  
  // User settings
  settings: SettingsSlice;
  
  // AI generation
  generation: GenerationSlice;
}
```

### Sequencer Slice

```typescript
interface SequencerSlice {
  // State
  patterns: Map<string, Pattern>;
  activePatternId: string;
  tracks: Track[];
  currentStep: number;
  isPlaying: boolean;
  bpm: number;
  swing: number;
  
  // Actions
  toggleStep: (trackId: string, stepIndex: number) => void;
  setStepSample: (trackId: string, stepIndex: number, sample: Sample) => void;
  setStepVelocity: (trackId: string, stepIndex: number, velocity: number) => void;
  setStepProbability: (trackId: string, stepIndex: number, prob: number) => void;
  clearTrack: (trackId: string) => void;
  clearPattern: () => void;
  
  // Pattern management
  savePattern: (name: string) => void;
  loadPattern: (id: string) => void;
  deletePattern: (id: string) => void;
  
  // Transport
  play: () => void;
  stop: () => void;
  setBPM: (bpm: number) => void;
  setSwing: (swing: number) => void;
}
```

### State Synchronization

```
User Action → Store Update → React Re-render
                ↓
          Side Effects
                ↓
    Audio Engine Update / API Call
```

### Persistence Strategy

```typescript
// Persist to IndexedDB
const persistConfig = {
  name: 'orbitr-storage',
  version: 1,
  storage: createIDBStorage(),
  partialize: (state) => ({
    patterns: state.sequencer.patterns,
    settings: state.settings,
    samples: state.audio.sampleLibrary,
  }),
};
```

---

## Component Hierarchy

### Main Application Structure

```
App
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── ProjectName
│   │   └── GlobalActions (Save/Load/Share)
│   └── Main
│       ├── SequencerView
│       │   ├── CircularSequencer
│       │   │   ├── TrackRing (×N tracks)
│       │   │   │   └── StepButton (×16 steps)
│       │   │   ├── Playhead
│       │   │   └── CenterControls
│       │   │       └── TrackLabels (O-R-B-I-T-R)
│       │   └── TransportBar
│       │       ├── PlayButton
│       │       ├── StopButton
│       │       ├── BPMControl
│       │       └── SwingControl
│       ├── SidePanel
│       │   ├── TrackControls
│       │   │   ├── VolumeSlider
│       │   │   ├── PanKnob
│       │   │   ├── MuteButton
│       │   │   └── SoloButton
│       │   ├── StepEditor
│       │   │   ├── SampleSelector
│       │   │   ├── VelocitySlider
│       │   │   ├── ProbabilitySlider
│       │   │   └── TimingOffset
│       │   └── SampleLibrary
│       │       ├── LocalSamples
│       │       ├── GeneratedSamples
│       │       └── UploadZone
│       └── GenerationPanel
│           ├── PromptInput
│           ├── GenerateButton
│           ├── QualitySelector
│           └── GenerationQueue
└── Modals
    ├── SettingsModal
    ├── ExportModal
    └── ShareModal
```

### Component Communication

```
                    ┌──────────────┐
                    │ Global Store │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐    ┌─────▼─────┐
   │Sequencer│      │   Controls  │    │  Library  │
   └────┬────┘      └──────┬──────┘    └─────┬─────┘
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐    ┌─────▼─────┐
   │  Tracks │      │   Knobs     │    │  Samples  │
   └─────────┘      └─────────────┘    └───────────┘
```

---

## Data Flow

### Sample Generation Flow

```
User Input (Prompt)
        │
        ▼
[Validate & Queue]
        │
        ▼
[Check Cache]────Yes───→ [Return Cached]
        │                        │
       No                        │
        ▼                        │
[Generate Request]               │
        │                        │
        ▼                        │
[Backend Processing]             │
        │                        │
        ▼                        │
[Return Audio Data]              │
        │                        │
        ▼                        │
[Decode & Cache]                 │
        │                        │
        ▼◄───────────────────────┘
[Update Library]
        │
        ▼
[Assign to Step]
```

### Pattern Playback Flow

```
Clock Tick (25ms)
        │
        ▼
[Check Lookahead Window]
        │
        ▼
[Get Active Steps]
        │
        ▼
[Apply Probability]
        │
        ▼
[Calculate Timing]
        │
        ▼
[Schedule AudioBufferSource]
        │
        ▼
[Update Visual Playhead]
        │
        ▼
[Advance Step Counter]
```

### State Update Flow

```
User Interaction
        │
        ▼
[Dispatch Action]
        │
        ▼
[Reducer/Store Update]
        │
        ├─────→ [Update UI]
        │
        ├─────→ [Update Audio Engine]
        │
        └─────→ [Persist to Storage]
```

---

## Performance Considerations

### Critical Performance Metrics

```yaml
Target Metrics:
  - Initial Load: < 3 seconds
  - Time to Interactive: < 5 seconds
  - Frame Rate: 60 FPS during playback
  - Audio Latency: < 10ms
  - Memory Usage: < 200MB baseline
  - CPU Usage: < 30% during playback
```

### Optimization Strategies

#### 1. Code Splitting
```javascript
// Lazy load heavy features
const SampleEditor = lazy(() => import('./components/SampleEditor'));
const ExportModal = lazy(() => import('./components/ExportModal'));
const AIGenerator = lazy(() => import('./components/AIGenerator'));
```

#### 2. Memoization
```typescript
// Memoize expensive calculations
const euclideanPattern = useMemo(
  () => calculateEuclidean(steps, pulses, rotation),
  [steps, pulses, rotation]
);

// Memoize components
const TrackRing = memo(({ track, isPlaying }) => {
  // Component implementation
}, (prev, next) => {
  return prev.track.id === next.track.id && 
         prev.isPlaying === next.isPlaying;
});
```

#### 3. Web Workers
```typescript
// Offload heavy processing
const waveformWorker = new Worker('/workers/waveform.js');
waveformWorker.postMessage({ 
  buffer: audioBuffer,
  resolution: 1024 
});
```

#### 4. Virtual Rendering
```typescript
// Virtualize large lists
import { VirtualList } from '@tanstack/react-virtual';

const SampleLibrary = ({ samples }) => {
  const virtualizer = useVirtualizer({
    count: samples.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
  });
};
```

### Memory Management

```typescript
class AudioBufferManager {
  private cache = new Map<string, AudioBuffer>();
  private maxCacheSize = 100 * 1024 * 1024; // 100MB
  private currentSize = 0;
  
  add(key: string, buffer: AudioBuffer) {
    const size = buffer.length * buffer.numberOfChannels * 4;
    
    // Evict if necessary
    while (this.currentSize + size > this.maxCacheSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, buffer);
    this.currentSize += size;
  }
  
  private evictOldest() {
    // LRU eviction strategy
  }
}
```

---

## Security Architecture

### Client-Side Security

```yaml
Measures:
  - Content Security Policy (CSP)
  - Subresource Integrity (SRI)
  - XSS Protection
  - CORS Configuration
  - Input Sanitization
  - Rate Limiting
```

### API Security

```python
# Rate limiting
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

@app.post("/generate", dependencies=[Depends(RateLimiter(times=10, seconds=60))])
async def generate_sample(request: GenerateRequest):
    # Implementation
```

### Data Privacy

```typescript
// Client-side encryption for sensitive data
import { encrypt, decrypt } from './crypto';

const savePattern = async (pattern: Pattern) => {
  const encrypted = await encrypt(pattern, userKey);
  await api.savePattern(encrypted);
};
```

---

## Deployment Architecture

### Production Infrastructure

```
┌─────────────────────────────────────────────────────────┐
│                      CloudFlare                          │
│                    (CDN + DDoS Protection)               │
└─────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────┐
│                       Vercel                             │
│                  (Next.js Hosting)                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Edge Functions  │  Static Assets  │  API Routes │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────┐
│                    Backend Services                      │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  API Server  │  │ GPU Instance │  │   Database  │  │
│  │  (FastAPI)   │  │  (MusicGen)  │  │ (PostgreSQL)│  │
│  └──────────────┘  └──────────────┘  └─────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │    Redis     │  │   S3/R2      │  │   Queue     │  │
│  │   (Cache)    │  │  (Storage)   │  │  (Celery)   │  │
│  └──────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Scaling Strategy

```yaml
Horizontal Scaling:
  - API Servers: Auto-scale based on CPU/Memory
  - GPU Workers: Queue-based scaling
  - Database: Read replicas for queries
  - Cache: Redis Cluster

Vertical Scaling:
  - GPU Instances: Upgrade for faster generation
  - Database: Increase resources as needed

Edge Computing:
  - Static assets via CDN
  - Edge functions for simple API calls
  - Regional caches for samples
```

### CI/CD Pipeline

```yaml
Pipeline:
  - Trigger: Push to main branch
  - Steps:
    1. Run tests (Jest, Playwright)
    2. Type checking (TypeScript)
    3. Linting (ESLint, Prettier)
    4. Build application
    5. Run security scan
    6. Deploy to staging
    7. Run E2E tests
    8. Deploy to production
    9. Monitor metrics
```

---

## Future Considerations

### Planned Architectural Changes

#### 1. WebAssembly Audio Processing
```typescript
// Future: WASM for performance-critical audio
import { WasmAudioProcessor } from './wasm/audio';

const processor = await WasmAudioProcessor.load();
const processedBuffer = processor.applyEffects(buffer, effects);
```

#### 2. WebRTC Collaboration
```typescript
// Future: Real-time collaboration
class CollaborationManager {
  private peer: RTCPeerConnection;
  private dataChannel: RTCDataChannel;
  
  syncPattern(changes: PatternDelta) {
    this.dataChannel.send(JSON.stringify(changes));
  }
}
```

#### 3. Plugin Architecture
```typescript
// Future: Extensible plugin system
interface OrbitrPlugin {
  name: string;
  version: string;
  init(context: PluginContext): void;
  processAudio?(buffer: AudioBuffer): AudioBuffer;
  renderUI?(): React.Component;
}
```

#### 4. Machine Learning Integration
```python
# Future: On-device ML for pattern suggestions
class PatternSuggestionModel:
    def __init__(self):
        self.model = self.load_tensorflow_js_model()
    
    def suggest_next_steps(self, current_pattern):
        return self.model.predict(current_pattern)
```

### Scalability Considerations

```yaml
10x Growth Plan:
  - Microservices architecture
  - GraphQL Federation
  - Event-driven architecture
  - Kubernetes orchestration
  - Multi-region deployment
  - Edge computing for audio

100x Growth Plan:
  - Custom CDN for samples
  - Distributed generation fleet
  - Blockchain for sample ownership
  - Decentralized storage (IPFS)
  - Native mobile apps
  - Hardware acceleration
```

---

## Appendices

### A. Performance Budgets

```javascript
// performance.config.js
export const budgets = {
  javascript: 500 * 1024,     // 500KB
  css: 100 * 1024,            // 100KB
  images: 200 * 1024,         // 200KB
  fonts: 100 * 1024,          // 100KB
  total: 1024 * 1024,         // 1MB
  
  metrics: {
    FCP: 1500,                // First Contentful Paint
    LCP: 2500,                // Largest Contentful Paint
    FID: 100,                 // First Input Delay
    CLS: 0.1,                 // Cumulative Layout Shift
    TTI: 5000,                // Time to Interactive
  }
};
```

### B. Browser Compatibility Matrix

```yaml
Supported Browsers:
  Chrome: 90+
  Firefox: 88+
  Safari: 14+
  Edge: 90+
  
Required APIs:
  - Web Audio API
  - Web Workers
  - IndexedDB
  - WebGL (for visualizations)
  - Clipboard API
  - File System Access API (optional)
  
Polyfills:
  - ResizeObserver
  - IntersectionObserver
  - Object.fromEntries
```

### C. Error Codes and Handling

```typescript
enum ErrorCode {
  // Audio Errors (1xxx)
  AUDIO_CONTEXT_FAILED = 1001,
  AUDIO_DECODE_FAILED = 1002,
  AUDIO_BUFFER_OVERFLOW = 1003,
  
  // Generation Errors (2xxx)
  GENERATION_TIMEOUT = 2001,
  GENERATION_INVALID_PROMPT = 2002,
  GENERATION_QUOTA_EXCEEDED = 2003,
  
  // Network Errors (3xxx)
  NETWORK_OFFLINE = 3001,
  NETWORK_TIMEOUT = 3002,
  NETWORK_RATE_LIMITED = 3003,
  
  // Storage Errors (4xxx)
  STORAGE_QUOTA_EXCEEDED = 4001,
  STORAGE_CORRUPTED = 4002,
  STORAGE_PERMISSION_DENIED = 4003,
}
```

---

## Document History

| Version | Date       | Author | Changes                     |
|---------|------------|--------|-----------------------------|
| 1.0.0   | 2024-12-20 | AI     | Initial architecture design |
| 1.1.0   | TBD        | TBD    | Add collaboration features  |
| 2.0.0   | TBD        | TBD    | Microservices migration    |

---

## References

- [Web Audio API Specification](https://www.w3.org/TR/webaudio/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [AudioCraft Documentation](https://github.com/facebookresearch/audiocraft)
- [System Design Primer](https://github.com/donnemartin/system-design-primer)
- [Music Theory for Computer Musicians](https://www.amazon.com/Theory-Computer-Musicians-Michael-Hewitt/dp/1598635034)
