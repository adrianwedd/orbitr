# 🎵 Orbitr AI Sequencer

A web-based circular step sequencer inspired by Playtronica's Orbita, featuring **multi-track polyphonic architecture** and AI-powered sample generation using Meta's MusicGen.

![Orbitr AI Sequencer](https://img.shields.io/badge/status-beta-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![GitHub Stars](https://img.shields.io/github/stars/adrianwedd/orbitr?style=social)
![GitHub Forks](https://img.shields.io/github/forks/adrianwedd/orbitr?style=social)

## ✨ Features

### 🎛️ Multi-Track Polyphonic Sequencer
- **4 concentric tracks** (O-R-B-I) with independent controls
- **Polyphonic playback** - all tracks play simultaneously
- **Per-track volume, mute, solo** controls
- **Visual track selection** with color-coded rings

### 🤖 AI-Powered Sample Generation
- **MusicGen integration** for real-time sample creation
- **5 curated sample packs**: Lo-Fi Hip Hop, Techno, Trap, House, Ambient
- **Smart caching** for instant recall of generated samples
- **Draft & HQ modes** for different quality/speed tradeoffs

### 🎮 Intuitive Interface
- **16-step circular sequencer** with visual playhead
- **Keyboard shortcuts** for rapid workflow
- **Drag-and-drop sample library**
- **Transport controls**: BPM (40-200), swing, reverse playback
- **WebAudio scheduling** for precise timing

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- (Optional) CUDA-capable GPU for faster generation

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/adrianwedd/orbitr.git
cd orbitr
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Set up Python backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env if needed
```

### Running the Application

**Option 1: Run both frontend and backend together**
```bash
npm run dev
```

**Option 2: Run separately**

Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate
python app.py
```

Terminal 2 - Frontend:
```bash
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎮 Usage

### Basic Workflow

1. **Select a track**: Click any step to select that track (or use vertical ORBITR labels)
2. **Choose a sample pack**: Use dropdown to generate complete themed kits
3. **Create patterns**: Click step circles to activate/deactivate on selected track  
4. **Generate custom samples**: Select step, press `G`, and enter prompts like "lofi kick drum"
5. **Mix tracks**: Use track controls for volume, mute, and solo
6. **Press Play**: Your polyphonic pattern comes to life!

### Multi-Track Operation

**Track Selection**
- Click any step circle to select that track and step
- Use vertical ORBITR labels on the right for direct track selection
- Selected track glows and shows step numbers

**Polyphonic Playback**
- All unmuted tracks play simultaneously
- Solo any track to hear it isolated
- Each track has independent volume control

### Sample Pack Generation

Choose from 5 curated packs:
- **🎵 Lo-Fi Hip Hop**: Warm, dusty drums with vinyl texture
- **🤖 Techno Essentials**: Sharp, industrial beats 
- **🔥 Trap Bangers**: Hard-hitting 808s and crisp snares
- **🏠 House Grooves**: Four-on-floor kicks and tight hats
- **🌙 Ambient Textures**: Atmospheric pads and organic percussion

### Keyboard Shortcuts

- `Space` - Play/Stop
- `G` - Generate sample for selected step
- `C` - Clear selected step  
- `R` - Toggle reverse
- `← →` - Adjust BPM
- `1-9, 0, Q-Y` - Select steps 1-16

## 🏗️ Architecture

```
orbitr/
├── app/                      # Next.js app directory
├── components/               # React components
│   ├── OrbitrSequencer.tsx  # Main multi-track sequencer
│   ├── TrackControls.tsx    # ORBITR track selector + controls
│   ├── StepEditor.tsx       # Per-step controls
│   ├── SampleLibrary.tsx    # Sample management
│   └── TransportControls.tsx # Play/BPM/Swing controls
├── lib/                     # Utilities and state
│   ├── audioStore.ts        # Multi-track Zustand store
│   ├── types.ts            # Track/Step TypeScript types
│   └── utils.ts            # Helper functions
└── backend/                # Python FastAPI server
    ├── app.py              # MusicGen API endpoints
    └── requirements.txt    # Python dependencies
```

### Key Technologies

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand
- **Audio**: Web Audio API with polyphonic scheduling
- **AI**: Meta's MusicGen via Transformers library
- **Backend**: FastAPI, PyTorch, base64 WAV encoding
- **Caching**: File-based cache with MD5 keys for instant sample recall

## 🔧 Configuration

### Environment Variables

```env
# API endpoint
NEXT_PUBLIC_API_URL=http://localhost:8000

# MusicGen models (optional)
MUSICGEN_MODEL=facebook/musicgen-small
MUSICGEN_MELODY_MODEL=facebook/musicgen-melody

# Cache settings
CACHE_ENABLED=true
MAX_CACHE_SIZE_MB=500
```

### Multi-Track Configuration

Edit `lib/audioStore.ts` to customize tracks:
```typescript
const tracks = [
  createTrack('track1', 'O', 180, '#ef4444'), // Red - Outer ring
  createTrack('track2', 'R', 150, '#3b82f6'), // Blue 
  createTrack('track3', 'B', 120, '#10b981'), // Green
  createTrack('track4', 'I', 90,  '#f59e0b'), // Yellow - Inner ring
];
```

### Audio Scheduling Settings

Edit `components/OrbitrSequencer.tsx`:
```typescript
const STEPS_COUNT = 16;    // Number of steps per track
const lookahead = 0.1;     // Scheduling lookahead (seconds)
const stepInterval = secondsPerBeat * 0.25; // 16th note timing
```

## 🎯 Advanced Features

### Sample Pack Generation

Generate complete themed kits with one dropdown selection:
```typescript
generateSamplePack('lofi')  // Creates 6 samples across all tracks
generateSamplePack('techno') // Optimized placement per genre
```

### Polyphonic Audio Engine

- **Simultaneous track playback** with independent gain chains
- **Mute/Solo logic** - solo overrides mute states
- **Per-step probability** with random triggering
- **Swing timing** with configurable offset

## 🐛 Troubleshooting

### "MusicGen models not loading"
The backend uses transformers library. If generation fails:
```bash
# Install transformers library
pip install transformers torch torchaudio

# For GPU acceleration (optional)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Polyphonic playback issues
- **Steps not playing on some tracks**: Check mute/solo states in track controls
- **Timing drift**: Adjust the lookahead value in OrbitrSequencer.tsx
- **Audio dropouts**: Close other audio applications for exclusive Web Audio access

### Sample generation problems
- **Long generation times**: Switch to "draft" mode for faster results
- **Cache not working**: Check backend cache directory permissions
- **CORS errors**: Ensure backend is running on port 8000

## 📝 API Reference

### POST /generate
Generate a single audio sample.

**Request:**
```json
{
  "prompt": "808 kick drum",
  "duration": 1.5,
  "quality": "draft",
  "seed": 42,
  "temperature": 1.0
}
```

**Response:**
```json
{
  "audio": "base64_encoded_wav",
  "name": "808-kick-drum-42",
  "seed": 42,
  "cached": false
}
```

### GET /cache/size
Get cache statistics.

### GET /cache/clear
Clear all cached samples.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by [Playtronica Orbita](https://playtronica.com/products/orbita)
- Built with [Meta's AudioCraft](https://github.com/facebookresearch/audiocraft)
- Uses [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

## 🚧 Roadmap

### ✅ Completed
- [x] Multi-track polyphonic architecture (4 concentric rings)
- [x] Track-specific volume, mute, solo controls  
- [x] 5 curated sample packs with strategic placement
- [x] Visual polish with glows and animations
- [x] Keyboard shortcuts for multi-track workflow

### 🎯 Upcoming Features
- [ ] Pattern save/load system
- [ ] WAV export via OfflineAudioContext
- [ ] MIDI output support
- [ ] Euclidean rhythm generator
- [ ] Real-time effects (reverb, delay, filter)
- [ ] Pattern morphing/interpolation between tracks
- [ ] WebSocket for real-time generation progress
- [ ] Docker containerization for easy deployment

---

Built with ❤️ for the music production community
