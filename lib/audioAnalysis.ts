// Audio Analysis Engine for Real-time Visual Reactivity
// Provides frequency, amplitude, and spectral data for UI animations

export interface AudioAnalysisData {
  // Overall levels
  rms: number;           // Root mean square (overall loudness)
  peak: number;          // Peak amplitude
  
  // Frequency bands
  bass: number;          // 20-250 Hz
  lowMid: number;        // 250-500 Hz  
  mid: number;           // 500-2000 Hz
  highMid: number;       // 2000-4000 Hz
  treble: number;        // 4000+ Hz
  
  // Spectral data
  spectrum: Float32Array;  // Full frequency spectrum
  
  // Derived values for UI
  energy: number;        // Musical energy level (0-1)
  brightness: number;    // High frequency content (0-1)
  warmth: number;        // Low frequency content (0-1)
  
  // Smoothed values for stable animations
  smoothRms: number;
  smoothPeak: number;
  smoothEnergy: number;
}

export class AudioAnalysisEngine {
  private analyserNode: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;
  // Backed by a concrete ArrayBuffer (not SharedArrayBuffer) so the typed
  // arrays satisfy the AnalyserNode get*Data() parameter types without casts.
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private timeDomainData: Uint8Array<ArrayBuffer> | null = null;
  private frequencyData: Float32Array<ArrayBuffer> | null = null;
  
  // Smoothing filters
  private rmsHistory: number[] = [];
  private peakHistory: number[] = [];
  private energyHistory: number[] = [];
  private readonly historyLength = 30; // ~0.5s at 60fps
  
  // Frequency band indices (calculated based on sample rate)
  private bassRange: [number, number] = [0, 0];
  private lowMidRange: [number, number] = [0, 0];
  private midRange: [number, number] = [0, 0];
  private highMidRange: [number, number] = [0, 0];
  private trebleRange: [number, number] = [0, 0];
  
  private isActive = false;
  private animationFrameId: number | null = null;
  private callbacks: ((data: AudioAnalysisData) => void)[] = [];

  async initialize(audioContext: AudioContext, sourceNode?: AudioNode): Promise<void> {
    this.audioContext = audioContext;
    
    // Create analyser node
    this.analyserNode = audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.3;
    
    // Wire the source (typically the app's master gain node) INTO the analyser
    // so the analyser actually receives audio to measure. The analyser is a
    // pass-through tap: we deliberately do NOT connect it to destination — the
    // source still reaches the speakers via its own existing routing, and an
    // input-less analyser (the previous behaviour when no source was passed)
    // only ever reads zeros, so the visuals never react.
    if (sourceNode) {
      sourceNode.connect(this.analyserNode);
    } else {
      console.warn(
        'AudioAnalysisEngine.initialize called without a source node; ' +
        'the analyser will have no input and report silence. Pass the master gain node.'
      );
    }

    // Initialize data arrays
    const bufferLength = this.analyserNode.frequencyBinCount;
    this.dataArray = new Uint8Array(new ArrayBuffer(bufferLength));
    this.timeDomainData = new Uint8Array(new ArrayBuffer(bufferLength));
    this.frequencyData = new Float32Array(new ArrayBuffer(bufferLength * Float32Array.BYTES_PER_ELEMENT));
    
    // Calculate frequency band ranges
    this.calculateFrequencyRanges();
    
    console.log('Audio analysis engine initialized');
  }

  private calculateFrequencyRanges(): void {
    if (!this.audioContext || !this.analyserNode) return;
    
    const sampleRate = this.audioContext.sampleRate;
    const binCount = this.analyserNode.frequencyBinCount;
    const binWidth = sampleRate / 2 / binCount;
    
    // Convert frequency ranges to bin indices
    this.bassRange = [
      Math.floor(20 / binWidth),
      Math.floor(250 / binWidth)
    ];
    this.lowMidRange = [
      Math.floor(250 / binWidth),
      Math.floor(500 / binWidth)
    ];
    this.midRange = [
      Math.floor(500 / binWidth),
      Math.floor(2000 / binWidth)
    ];
    this.highMidRange = [
      Math.floor(2000 / binWidth),
      Math.floor(4000 / binWidth)
    ];
    this.trebleRange = [
      Math.floor(4000 / binWidth),
      Math.min(binCount - 1, Math.floor(20000 / binWidth))
    ];
  }

  start(): void {
    if (this.isActive || !this.analyserNode || !this.dataArray) return;
    
    this.isActive = true;
    this.analyze();
  }

  stop(): void {
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private analyze = (): void => {
    if (
      !this.isActive ||
      !this.analyserNode ||
      !this.dataArray ||
      !this.timeDomainData ||
      !this.frequencyData
    ) {
      return;
    }

    // Frequency-domain data drives the per-band averages (bass/mid/treble/...)
    this.analyserNode.getByteFrequencyData(this.dataArray);
    this.analyserNode.getFloatFrequencyData(this.frequencyData);
    // Time-domain (waveform) data is the correct source for loudness (RMS/peak)
    this.analyserNode.getByteTimeDomainData(this.timeDomainData);

    // Calculate analysis data
    const analysisData = this.calculateAnalysisData();
    
    // Notify callbacks
    this.callbacks.forEach(callback => callback(analysisData));
    
    // Schedule next analysis
    this.animationFrameId = requestAnimationFrame(this.analyze);
  };

  private calculateAnalysisData(): AudioAnalysisData {
    if (!this.dataArray || !this.timeDomainData || !this.frequencyData) {
      return this.getEmptyAnalysisData();
    }

    // Calculate RMS and peak from the time-domain (waveform) samples. Byte
    // time-domain data is centred on 128 (silence), so we normalise to -1..1.
    // Using frequency bytes here (the previous bug) does not represent loudness.
    let sum = 0;
    let peak = 0;

    for (let i = 0; i < this.timeDomainData.length; i++) {
      const value = (this.timeDomainData[i] - 128) / 128; // Normalize to -1 to 1
      sum += value * value;
      peak = Math.max(peak, Math.abs(value));
    }

    const rms = Math.sqrt(sum / this.timeDomainData.length);

    // Calculate frequency bands
    const bass = this.getFrequencyBandAverage(this.bassRange);
    const lowMid = this.getFrequencyBandAverage(this.lowMidRange);
    const mid = this.getFrequencyBandAverage(this.midRange);
    const highMid = this.getFrequencyBandAverage(this.highMidRange);
    const treble = this.getFrequencyBandAverage(this.trebleRange);

    // Calculate derived values
    const energy = Math.min(1, (bass + mid + treble) / 3);
    const brightness = treble / Math.max(0.01, bass + lowMid + mid + highMid + treble);
    const warmth = bass / Math.max(0.01, bass + lowMid + mid + highMid + treble);

    // Update history for smoothing
    this.updateHistory(rms, peak, energy);

    // Calculate smoothed values
    const smoothRms = this.getHistoryAverage(this.rmsHistory);
    const smoothPeak = this.getHistoryAverage(this.peakHistory);
    const smoothEnergy = this.getHistoryAverage(this.energyHistory);

    return {
      rms,
      peak,
      bass,
      lowMid,
      mid,
      highMid,
      treble,
      spectrum: new Float32Array(this.frequencyData),
      energy,
      brightness,
      warmth,
      smoothRms,
      smoothPeak,
      smoothEnergy
    };
  }

  private getFrequencyBandAverage([start, end]: [number, number]): number {
    if (!this.dataArray) return 0;
    
    let sum = 0;
    let count = 0;
    
    for (let i = start; i <= end && i < this.dataArray.length; i++) {
      sum += this.dataArray[i] / 255; // Normalize to 0-1
      count++;
    }
    
    return count > 0 ? sum / count : 0;
  }

  private updateHistory(rms: number, peak: number, energy: number): void {
    this.rmsHistory.push(rms);
    this.peakHistory.push(peak);
    this.energyHistory.push(energy);
    
    // Keep history at fixed length
    if (this.rmsHistory.length > this.historyLength) {
      this.rmsHistory.shift();
      this.peakHistory.shift();
      this.energyHistory.shift();
    }
  }

  private getHistoryAverage(history: number[]): number {
    if (history.length === 0) return 0;
    const sum = history.reduce((acc, val) => acc + val, 0);
    return sum / history.length;
  }

  private getEmptyAnalysisData(): AudioAnalysisData {
    return {
      rms: 0,
      peak: 0,
      bass: 0,
      lowMid: 0,
      mid: 0,
      highMid: 0,
      treble: 0,
      spectrum: new Float32Array(1024),
      energy: 0,
      brightness: 0,
      warmth: 0,
      smoothRms: 0,
      smoothPeak: 0,
      smoothEnergy: 0
    };
  }

  // Callback management
  onAnalysis(callback: (data: AudioAnalysisData) => void): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  // Utility methods for common UI needs
  static getColorTemperature(brightness: number, warmth: number): { h: number; s: number; l: number } {
    // Convert audio characteristics to HSL color values
    const hue = warmth > brightness ? 30 + (warmth * 60) : 180 + (brightness * 120); // Warm orange to cool blue
    const saturation = 0.6 + (Math.abs(brightness - warmth) * 0.4); // More contrast = more saturation
    const lightness = 0.3 + (Math.max(brightness, warmth) * 0.4); // Brighter audio = lighter colors
    
    return { h: hue, s: saturation, l: lightness };
  }

  static getVisualizationIntensity(energy: number, smoothEnergy: number): number {
    // Blend current energy with smooth energy for stable but responsive visuals
    return (energy * 0.7) + (smoothEnergy * 0.3);
  }

  cleanup(): void {
    this.stop();
    
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    
    this.audioContext = null;
    this.dataArray = null;
    this.timeDomainData = null;
    this.frequencyData = null;
    this.callbacks = [];
    this.rmsHistory = [];
    this.peakHistory = [];
    this.energyHistory = [];
  }
}

// Global instance for easy access
export const audioAnalysis = new AudioAnalysisEngine();