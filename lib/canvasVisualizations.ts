// Canvas-based Visualization System for ORBITR
// High-performance 60fps audio-reactive animations

import { AudioAnalysisData } from './audioAnalysis';
import { calculateAudioReactiveColor } from './designSystem';

export interface VisualizationConfig {
  width: number;
  height: number;
  pixelRatio: number;
  fps: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: [number, number, number, number]; // RGBA
  type: 'ambient' | 'bass' | 'treble' | 'energy';
}

export interface WaveformRing {
  radius: number;
  color: string;
  intensity: number;
  rotation: number;
  segments: number;
  amplitudes: number[];
}

export class CanvasVisualizationEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: VisualizationConfig;
  private isRunning = false;
  private animationId: number | null = null;
  private lastFrameTime = 0;
  
  // Visualization state
  private particles: Particle[] = [];
  private waveformRings: WaveformRing[] = [];
  private backgroundGradient: CanvasGradient | null = null;
  private audioData: AudioAnalysisData | null = null;
  
  // Performance tracking
  private frameCount = 0;
  private fpsTimer = 0;
  private actualFps = 0;

  constructor(canvas: HTMLCanvasElement, config: Partial<VisualizationConfig> = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    
    this.config = {
      width: canvas.width || 800,
      height: canvas.height || 600,
      pixelRatio: window.devicePixelRatio || 1,
      fps: 60,
      ...config
    };
    
    this.setupCanvas();
    this.initializeVisualizationElements();
  }

  private setupCanvas(): void {
    const { width, height, pixelRatio } = this.config;
    
    // Set actual canvas size
    this.canvas.width = width * pixelRatio;
    this.canvas.height = height * pixelRatio;
    
    // Set display size
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    // Scale context for crisp rendering
    this.ctx.scale(pixelRatio, pixelRatio);
    
    // Set default styles
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  private initializeVisualizationElements(): void {
    const { width, height } = this.config;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create background gradient
    this.backgroundGradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, Math.max(width, height) / 2
    );
    this.backgroundGradient.addColorStop(0, 'rgba(16, 16, 20, 0.95)');
    this.backgroundGradient.addColorStop(1, 'rgba(8, 8, 12, 1)');
    
    // Initialize waveform rings for each track
    const baseRadius = Math.min(width, height) * 0.15;
    this.waveformRings = [
      { radius: baseRadius + 60, color: '#ef4444', intensity: 0, rotation: 0, segments: 64, amplitudes: new Array(64).fill(0) },
      { radius: baseRadius + 40, color: '#3b82f6', intensity: 0, rotation: 0, segments: 64, amplitudes: new Array(64).fill(0) },
      { radius: baseRadius + 20, color: '#10b981', intensity: 0, rotation: 0, segments: 64, amplitudes: new Array(64).fill(0) },
      { radius: baseRadius, color: '#f59e0b', intensity: 0, rotation: 0, segments: 64, amplitudes: new Array(64).fill(0) }
    ];
    
    // Initialize particle system
    this.initializeParticles();
  }

  private initializeParticles(): void {
    const { width, height } = this.config;
    const particleCount = 50;
    
    this.particles = [];
    
    for (let i = 0; i < particleCount; i++) {
      this.particles.push(this.createParticle(width, height));
    }
  }

  private createParticle(width: number, height: number): Particle {
    const types: Particle['type'][] = ['ambient', 'bass', 'treble', 'energy'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      life: Math.random() * 100,
      maxLife: 100 + Math.random() * 200,
      size: 1 + Math.random() * 3,
      color: [255, 255, 255, 0.1 + Math.random() * 0.3],
      type
    };
  }

  updateAudioData(audioData: AudioAnalysisData): void {
    this.audioData = audioData;
    
    // Update waveform rings with audio data
    if (this.waveformRings.length >= 4) {
      this.waveformRings[0].intensity = audioData.bass;
      this.waveformRings[1].intensity = audioData.mid;
      this.waveformRings[2].intensity = audioData.mid;
      this.waveformRings[3].intensity = audioData.treble;
      
      // Update amplitude arrays with spectrum data
      this.waveformRings.forEach((ring, index) => {
        const startBin = Math.floor((index / 4) * audioData.spectrum.length);
        const endBin = Math.floor(((index + 1) / 4) * audioData.spectrum.length);
        
        for (let i = 0; i < ring.segments; i++) {
          const binIndex = startBin + Math.floor((i / ring.segments) * (endBin - startBin));
          const amplitude = Math.abs(audioData.spectrum[binIndex] || 0) / 100; // Normalize
          
          // Smooth amplitude changes
          ring.amplitudes[i] = ring.amplitudes[i] * 0.7 + amplitude * 0.3;
        }
      });
    }
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animate();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (currentTime: number = performance.now()): void => {
    if (!this.isRunning) return;
    
    const deltaTime = currentTime - this.lastFrameTime;
    const targetFrameTime = 1000 / this.config.fps;
    
    if (deltaTime >= targetFrameTime) {
      this.update(deltaTime);
      this.render();
      
      this.lastFrameTime = currentTime;
      this.updateFpsCounter(currentTime);
    }
    
    this.animationId = requestAnimationFrame(this.animate);
  };

  private updateFpsCounter(currentTime: number): void {
    this.frameCount++;
    
    if (currentTime - this.fpsTimer >= 1000) {
      this.actualFps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = currentTime;
    }
  }

  private update(deltaTime: number): void {
    const { width, height } = this.config;
    
    // Update particles
    this.particles.forEach(particle => {
      this.updateParticle(particle, deltaTime, width, height);
    });
    
    // Update waveform ring rotations
    this.waveformRings.forEach((ring, index) => {
      ring.rotation += (0.5 + ring.intensity * 2) * deltaTime * 0.001;
      
      // Update colors based on audio data
      if (this.audioData) {
        ring.color = calculateAudioReactiveColor(`track${['O', 'R', 'B', 'I'][index]}`, this.audioData);
      }
    });
    
    // Spawn new particles based on audio energy
    if (this.audioData && this.audioData.energy > 0.5 && this.particles.length < 100) {
      if (Math.random() < this.audioData.energy * 0.1) {
        this.particles.push(this.createParticle(width, height));
      }
    }
    
    // Remove dead particles
    this.particles = this.particles.filter(particle => particle.life > 0);
  }

  private updateParticle(particle: Particle, deltaTime: number, width: number, height: number): void {
    // Update position
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;
    
    // Update life
    particle.life -= deltaTime * 0.02;
    
    // Update velocity based on audio data and particle type
    if (this.audioData) {
      const audioInfluence = this.getAudioInfluenceForParticle(particle);
      
      // Add slight attraction to center for ambient particles
      if (particle.type === 'ambient') {
        const centerX = width / 2;
        const centerY = height / 2;
        const dx = centerX - particle.x;
        const dy = centerY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          particle.vx += (dx / distance) * audioInfluence * 0.01;
          particle.vy += (dy / distance) * audioInfluence * 0.01;
        }
      }
      
      // Apply audio-based forces
      particle.vx += (Math.random() - 0.5) * audioInfluence * 0.02;
      particle.vy += (Math.random() - 0.5) * audioInfluence * 0.02;
      
      // Update size based on audio
      particle.size = 1 + audioInfluence * 3;
      
      // Update alpha based on life and audio
      particle.color[3] = (particle.life / particle.maxLife) * (0.3 + audioInfluence * 0.7);
    }
    
    // Apply velocity damping
    particle.vx *= 0.99;
    particle.vy *= 0.99;
    
    // Wrap around screen edges
    if (particle.x < 0) particle.x = width;
    if (particle.x > width) particle.x = 0;
    if (particle.y < 0) particle.y = height;
    if (particle.y > height) particle.y = 0;
  }

  private getAudioInfluenceForParticle(particle: Particle): number {
    if (!this.audioData) return 0;
    
    switch (particle.type) {
      case 'bass':
        return this.audioData.bass;
      case 'treble':
        return this.audioData.treble;
      case 'energy':
        return this.audioData.energy;
      case 'ambient':
      default:
        return this.audioData.smoothEnergy;
    }
  }

  private render(): void {
    const { width, height } = this.config;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);
    
    // Draw background with gradient
    if (this.backgroundGradient) {
      this.ctx.fillStyle = this.backgroundGradient;
      this.ctx.fillRect(0, 0, width, height);
    }
    
    // Draw audio-reactive background effects
    this.renderBackgroundEffects();
    
    // Draw particles
    this.renderParticles();
    
    // Draw waveform rings
    this.renderWaveformRings();
    
    // Draw debug info in development
    if (process.env.NODE_ENV === 'development') {
      this.renderDebugInfo();
    }
  }

  private renderBackgroundEffects(): void {
    if (!this.audioData) return;
    
    const { width, height } = this.config;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create pulsing aura based on energy
    const energy = this.audioData.smoothEnergy;
    if (energy > 0.1) {
      const radius = (width + height) / 4;
      const auraRadius = radius * (1 + energy * 0.5);
      
      const gradient = this.ctx.createRadialGradient(
        centerX, centerY, radius * 0.5,
        centerX, centerY, auraRadius
      );
      
      const alpha = energy * 0.1;
      gradient.addColorStop(0, `rgba(16, 185, 129, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(139, 92, 246, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private renderParticles(): void {
    this.particles.forEach(particle => {
      const [r, g, b, a] = particle.color;
      
      this.ctx.save();
      this.ctx.globalAlpha = a;
      this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      
      // Draw particle with glow effect
      this.ctx.shadowColor = this.ctx.fillStyle;
      this.ctx.shadowBlur = particle.size * 2;
      
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    });
  }

  private renderWaveformRings(): void {
    const { width, height } = this.config;
    const centerX = width / 2;
    const centerY = height / 2;
    
    this.waveformRings.forEach(ring => {
      this.ctx.save();
      
      // Set ring color with alpha based on intensity
      const alpha = 0.3 + ring.intensity * 0.7;
      this.ctx.strokeStyle = ring.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      this.ctx.lineWidth = 2 + ring.intensity * 3;
      
      // Add glow effect
      this.ctx.shadowColor = ring.color;
      this.ctx.shadowBlur = ring.intensity * 10;
      
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(ring.rotation);
      
      // Draw waveform as connected segments
      this.ctx.beginPath();
      
      for (let i = 0; i < ring.segments; i++) {
        const angle = (i / ring.segments) * Math.PI * 2;
        const amplitude = ring.amplitudes[i] || 0;
        const radius = ring.radius + amplitude * 20;
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      
      this.ctx.closePath();
      this.ctx.stroke();
      
      this.ctx.restore();
    });
  }

  private renderDebugInfo(): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '12px monospace';
    
    const debugInfo = [
      `FPS: ${this.actualFps}`,
      `Particles: ${this.particles.length}`,
      ...(this.audioData ? [
        `Energy: ${this.audioData.energy.toFixed(2)}`,
        `Bass: ${this.audioData.bass.toFixed(2)}`,
        `Treble: ${this.audioData.treble.toFixed(2)}`
      ] : [])
    ];
    
    debugInfo.forEach((line, index) => {
      this.ctx.fillText(line, 10, 20 + index * 15);
    });
    
    this.ctx.restore();
  }

  // Public methods for controlling visualizations
  setIntensity(intensity: number): void {
    this.waveformRings.forEach(ring => {
      ring.intensity = Math.max(ring.intensity, intensity);
    });
  }

  addBurst(x: number, y: number, intensity: number = 1): void {
    const burstParticles = 5 + Math.floor(intensity * 10);
    
    for (let i = 0; i < burstParticles; i++) {
      const angle = (i / burstParticles) * Math.PI * 2;
      const speed = 1 + intensity * 3;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 50 + intensity * 100,
        maxLife: 50 + intensity * 100,
        size: 2 + intensity * 3,
        color: [255, 255, 255, 0.8],
        type: 'energy'
      });
    }
  }

  resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    this.setupCanvas();
    this.initializeVisualizationElements();
  }

  cleanup(): void {
    this.stop();
    this.particles = [];
    this.waveformRings = [];
  }

  // Getters for external access
  get fps(): number {
    return this.actualFps;
  }

  get particleCount(): number {
    return this.particles.length;
  }
}

// Utility functions for creating visualizations
export function createVisualizationCanvas(
  container: HTMLElement,
  config?: Partial<VisualizationConfig>
): { canvas: HTMLCanvasElement; engine: CanvasVisualizationEngine } {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '1';
  
  container.appendChild(canvas);
  
  const rect = container.getBoundingClientRect();
  const engine = new CanvasVisualizationEngine(canvas, {
    width: rect.width,
    height: rect.height,
    ...config
  });
  
  return { canvas, engine };
}

export default CanvasVisualizationEngine;