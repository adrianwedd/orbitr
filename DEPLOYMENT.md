# ORBITR Deployment Guide

ORBITR can be deployed in multiple configurations depending on your needs.

## 🚀 Deployment Options

### 1. GitHub Pages (Static - Recommended for Demo) ✅

**Features Available:**
- ✅ Full sequencer functionality (4-track O-R-B-I)
- ✅ Audio playback and Web Audio API
- ✅ Local file upload and drag-and-drop
- ✅ Enhanced sample packs (Detroit, Berlin, UK Garage vibes)
- ✅ Mock AI generation (synthetic samples)
- ✅ All UI functionality and keyboard shortcuts

**Setup:**
1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. Push to main branch - automatic deployment via workflow

**Build Commands:**
```bash
pnpm run build:static  # Build for static deployment
```

### 2. Full-Stack Deployment (With Real AI) 🤖

**Platforms:**
- **Vercel** (recommended for Next.js)
- **Railway** (full-stack with containers)
- **Render** (frontend + backend)
- **Heroku** (full application)

**Features Available:**
- ✅ Everything from GitHub Pages
- ✅ Real MusicGen AI sample generation
- ✅ Backend API with caching
- ✅ Advanced audio processing

**Environment Variables for AI:**
```bash
# Optional: Use HuggingFace API for AI generation on GitHub Pages
NEXT_PUBLIC_HUGGINGFACE_API_KEY=your_key_here

# For full backend deployment
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### 3. Hybrid Deployment

- **Frontend:** GitHub Pages (free static hosting)
- **Backend:** Railway/Render (AI generation API)
- **Connection:** CORS-enabled API calls

## 🎵 Sample Packs

### Classic Packs:
- **Lo-Fi**: Warm, nostalgic vibes
- **Techno**: Industrial beats
- **Trap**: Modern 808s and snares
- **House**: Classic four-on-the-floor
- **Ambient**: Atmospheric textures

### 90s Vibes Collection:
- **Detroit**: Motor City soul with analog warmth
- **Berlin**: Dark underground warehouse atmosphere  
- **UK Garage**: Skippy beats with characteristic swing

## 🛠 Development

**Local Development:**
```bash
pnpm dev             # Full stack (frontend + backend)
pnpm dev:frontend    # Frontend only (port 3000)
pnpm dev:backend     # Backend only (port 8000)
```

**Testing:**
```bash
pnpm test                # Unit tests
pnpm test:e2e            # E2E tests (Playwright)
```

**Build:**
```bash
pnpm run build         # Standard Next.js build
pnpm run build:static  # Static export for GitHub Pages
```

## 📦 GitHub Actions Workflow

The repository includes automatic deployment:

- **Trigger:** Push to main branch
- **Process:** Build → Test → Deploy to GitHub Pages  
- **URL:** `https://yourusername.github.io/orbitr`

## 🎛 Features Comparison

| Feature | GitHub Pages | Full-Stack |
|---------|-------------|------------|
| Sequencer | ✅ | ✅ |
| Audio Engine | ✅ | ✅ |
| File Upload | ✅ | ✅ |
| Sample Packs | ✅ | ✅ |
| Real AI Generation | ❌ | ✅ |
| Backend Caching | ❌ | ✅ |
| Cost | Free | Varies |
| Setup Complexity | Simple | Moderate |

## 🚀 Quick Deploy to GitHub Pages

1. Fork/clone the repository
2. Enable GitHub Pages in Settings → Pages
3. Select "GitHub Actions" as source
4. Push to main branch
5. Visit `https://yourusername.github.io/orbitr`

Your ORBITR sequencer will be live with Detroit/Berlin 90s sample packs! 🎵