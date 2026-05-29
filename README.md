# 🎵 Orbitr - AI-Powered Circular Step Sequencer

[![CI](https://github.com/adrianwedd/orbitr/workflows/CI/badge.svg)](https://github.com/adrianwedd/orbitr/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

A web-based polyphonic circular step sequencer inspired by Playtronica's Orbita, enhanced with AI-powered sample generation using Meta's MusicGen/AudioCraft.

![Orbitr Demo](https://img.shields.io/badge/Demo-Coming%20Soon-brightgreen)

## ✨ Features

### 🎹 Multi-Track Polyphonic Sequencer
- **4 concentric track rings** - Each with independent controls
- **16-step patterns** per track
- **Polyphonic playback** - All tracks play simultaneously
- **Visual feedback** - Animated playhead and step indicators

### 🤖 AI Sample Generation
- **MusicGen integration** - Generate samples from text prompts
- **Multiple quality modes** - Draft (fast) and HQ (high quality)
- **Smart caching** - Instant recall of previously generated samples
- **Genre packs** - Pre-configured sample generation templates

### 🔒 Backend Security
- **Bearer-token API auth** - Generation and cache endpoints require a token (set via the `API_KEY` env var); relaxed in `development`, enforced in `production`.
- **Rate limiting** - Per-endpoint limits via [slowapi](https://github.com/laurentS/slowapi) (`GENERATION_RATE_LIMIT`, etc.).
- **Input sanitization** - Prompts are cleaned with [bleach](https://github.com/mozilla/bleach) and capped by `MAX_PROMPT_LENGTH`.
- **Concurrency + timeout limits** - Per-generation guards via `MAX_CONCURRENT_GENERATIONS` and `GENERATION_TIMEOUT`.
- **Trusted-proxy aware** - Forwarded headers (`X-Forwarded-For`) are honored only from configured `TRUSTED_PROXIES`, preventing rate-limit/IP-block spoofing.
- **Structured security logging** - Security events are written to `backend/security.log`.
- **Observability endpoints** - `GET /health` for health/config status and `GET /security/metrics` for security telemetry.

### 🎛️ Professional Controls
- **Per-track controls** - Volume, mute, solo, clear
- **Per-step parameters** - Gain, probability, timing offset
- **Global controls** - BPM (40-200), swing, master volume
- **Transport** - Play/stop with reverse playback option

### ⌨️ Keyboard Shortcuts
- `Space` - Play/Stop
- `G` - Generate sample for selected step
- `C` - Clear selected step
- `1-9, 0` - Select steps 1-10
- `Q, W, E, R, T, Y` - Select steps 11-16
- `←/→` - Adjust BPM
- `Shift+Click` - Multi-select steps

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm (`npm install -g pnpm`)
- Python 3.9+ (for AI backend)
- Modern browser with Web Audio API support

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/adrianwedd/orbitr.git
cd orbitr
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up Python backend (optional, for AI generation)**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Full AI backend (MusicGen/AudioCraft + torch):
pip install -r requirements.txt

# Or minimal / fake-audio mode (no torch, no heavy AI stack):
pip install -r requirements-minimal.txt
cd ..
```

> **Running backend tests?** Install the dev dependencies instead:
> ```bash
> cd backend && pip install -r requirements-dev.txt
> ```
> This layers `pytest` + `httpx` on top of `requirements-minimal.txt`, letting the
> test suite run in fake-audio mode without pulling in the heavy AI/torch stack.

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env if needed
```

5. **Run the application**
```bash
pnpm dev
# Frontend: http://localhost:3000
# Backend: http://localhost:8000

# Or run individually:
pnpm dev:frontend  # Frontend only
pnpm dev:backend   # Backend only
```

## 🚀 Quick Deploy to GitHub Pages

ORBITR works perfectly on GitHub Pages with enhanced sample packs:

```bash
# Build static version
pnpm run build:static

# Or just push to main branch for automatic deployment
git push origin main
```

**Features on GitHub Pages:**
- ✅ Full 4-track sequencer (O-R-B-I rings)  
- ✅ Detroit/Berlin 90s sample packs 🔥
- ✅ UK Garage skippy beats
- ✅ Web Audio API polyphonic playback
- ✅ Drag & drop file upload
- ✅ Intelligent mock AI generation

**Live Demo:** `https://yourusername.github.io/orbitr`

> See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment options including real AI generation.

## 🎮 How to Use

1. **Select a track** - Click on the O, R, B, or I buttons
2. **Add steps** - Click on the circles in the ring to activate steps
3. **Assign samples** - Load audio files or generate with AI
4. **Adjust parameters** - Use the track controls panel
5. **Press Play** - Watch your pattern come to life!

### Sample Generation
- Enter a prompt like "kick drum" or "synth bass"
- Choose quality (Draft for quick iteration, HQ for final)
- Generated samples are automatically cached

### Sample Packs
Choose from pre-configured genre packs:
- 🎵 Lo-Fi Hip Hop
- 🤖 Techno Essentials
- 🔥 Trap Bangers
- 🏠 House Grooves
- 🌙 Ambient Textures

## 🏗️ Architecture

```
Frontend (Next.js/React)
├── Multi-track sequencer engine
├── Web Audio API scheduler
├── Real-time visualization
└── Zustand state management

Backend (FastAPI/Python)
├── MusicGen integration
├── Audio processing
├── Caching layer
└── Sample management
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical documentation.

## 🗺️ Roadmap

See [ROADMAP.md](ROADMAP.md) for the full development plan.

### Next Features
- [ ] Pattern save/load
- [ ] MIDI export
- [ ] Euclidean rhythm generator
- [ ] Per-step effects
- [ ] Pattern chaining
- [ ] WebRTC collaboration

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development

```bash
# Run tests
pnpm test

# Run linter
pnpm run lint

# Type check
pnpm run type-check

# Build for production
pnpm run build
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Playtronica Orbita](https://playtronica.com)
- Built with [Meta's AudioCraft](https://github.com/facebookresearch/audiocraft)
- Uses [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- UI powered by [Next.js](https://nextjs.org/) and [Tailwind CSS](https://tailwindcss.com/)

## 🐛 Found a Bug?

Please [open an issue](https://github.com/adrianwedd/orbitr/issues/new?template=bug_report.md) with details about the problem.

## 💡 Have an Idea?

We'd love to hear it! [Submit a feature request](https://github.com/adrianwedd/orbitr/issues/new?template=feature_request.md).

## 📊 Status

- **Current Version**: 0.1.0 (Alpha)
- **Status**: Active Development
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

**Built with ❤️ for the music production community**

[Demo](https://orbitr.vercel.app) | [Documentation](https://github.com/adrianwedd/orbitr/wiki) | [Discord](https://discord.gg/orbitr)
