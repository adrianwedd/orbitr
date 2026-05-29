import { config } from './config';
import { SampleLibraryItem } from './types';
import { rid } from './utils';

// For GitHub Pages deployment, we can either:
// 1. Use external API services (HuggingFace, Replicate, etc.)
// 2. Pre-generate samples and embed them as base64
// 3. Load samples from a CDN or external storage

// Shared AudioContext singleton.
//
// Browsers cap the number of live AudioContexts (~6 in Chrome). Previously
// every decode/preview created its own `new AudioContext()` and never closed
// it, so loading a sample pack would exhaust the cap and subsequent contexts
// would fail. We reuse a single lazily-created context for all one-off
// decodes/previews across the sample-loading UI instead.
let sharedAudioContext: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('AudioContext is only available in the browser');
  }
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new Ctx();
  }
  return sharedAudioContext;
}

export async function generateStaticSample(prompt: string): Promise<SampleLibraryItem> {
  if (!config.isStaticMode) {
    throw new Error('Static samples only available in static mode');
  }

  // Option 1: External API Integration (example with HuggingFace)
  if (process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY) {
    return await generateWithHuggingFace(prompt);
  }

  // Option 2: Mock generation with pre-defined samples
  return generateMockSample(prompt);
}

async function generateWithHuggingFace(prompt: string): Promise<SampleLibraryItem> {
  try {
    const response = await fetch('https://api-inference.huggingface.co/models/facebook/musicgen-small', {
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          duration: 8,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Decode audio with the shared Web Audio context (never closed; reused)
    const audioContext = getSharedAudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    return {
      id: rid(),
      name: `AI: ${prompt.slice(0, 20)}${prompt.length > 20 ? '...' : ''}`,
      buffer: audioBuffer,
      duration: audioBuffer.duration,
      type: 'ai',
      prompt
    };
  } catch (error) {
    console.error('HuggingFace generation failed:', error);
    return generateMockSample(prompt);
  }
}

async function generateMockSample(prompt: string): Promise<SampleLibraryItem> {
  // Create a synthetic audio buffer for demonstration (shared, reused context)
  const audioContext = getSharedAudioContext();
  const sampleRate = audioContext.sampleRate;
  const duration = 2; // 2 seconds
  const numSamples = sampleRate * duration;
  
  const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  
  // Generate different types of sounds based on prompt keywords
  const frequency = getFrequencyFromPrompt(prompt);
  const envelope = getEnvelopeFromPrompt(prompt);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelopeValue = envelope(t, duration);
    
    if (prompt.toLowerCase().includes('kick')) {
      // Low frequency thump with envelope
      channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelopeValue * 0.8;
    } else if (prompt.toLowerCase().includes('snare')) {
      // White noise with envelope
      channelData[i] = (Math.random() * 2 - 1) * envelopeValue * 0.6;
    } else if (prompt.toLowerCase().includes('hat')) {
      // High frequency noise burst
      channelData[i] = (Math.random() * 2 - 1) * envelopeValue * 0.4;
    } else {
      // Default tone
      channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelopeValue * 0.5;
    }
  }
  
  return {
    id: rid(),
    name: `Mock: ${prompt.slice(0, 20)}${prompt.length > 20 ? '...' : ''}`,
    buffer: audioBuffer,
    duration: audioBuffer.duration,
    type: 'ai',
    prompt
  };
}

function getFrequencyFromPrompt(prompt: string): number {
  const lower = prompt.toLowerCase();
  
  if (lower.includes('kick') || lower.includes('bass')) return 60;
  if (lower.includes('snare')) return 200;
  if (lower.includes('hat') || lower.includes('cymbal')) return 8000;
  if (lower.includes('lead') || lower.includes('melody')) return 440;
  if (lower.includes('pad') || lower.includes('ambient')) return 220;
  
  return 330; // Default
}

function getEnvelopeFromPrompt(prompt: string): (t: number, duration: number) => number {
  const lower = prompt.toLowerCase();
  
  if (lower.includes('kick') || lower.includes('snare')) {
    // Sharp attack, quick decay
    return (t, d) => Math.exp(-t * 8) * (t < 0.1 ? 1 : Math.exp(-(t - 0.1) * 20));
  }
  
  if (lower.includes('pad') || lower.includes('ambient')) {
    // Slow attack, sustained
    return (t, d) => Math.min(t * 4, 1) * (1 - t / d);
  }
  
  // Default envelope
  return (t, d) => Math.exp(-t * 2) * (1 - t / d);
}

// Pre-generated sample pack data (base64 encoded short samples)
// These could be generated ahead of time and included in the build
export const PREGENERATED_SAMPLES: Record<string, string> = {
  // Base64 encoded audio data would go here
  // This is just a placeholder structure
};