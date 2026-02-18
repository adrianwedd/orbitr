// Enhanced Design System for ORBITR
// Audio-reactive colors, sophisticated typography, and animation utilities

import { AudioAnalysisData } from './audioAnalysis';

export interface ColorPalette {
  // Base colors
  primary: string;
  secondary: string;
  accent: string;
  
  // Semantic colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Neutrals
  background: string;
  surface: string;
  border: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  
  // Audio-reactive colors
  reactive: {
    bass: string;
    mid: string;
    treble: string;
    energy: string;
  };
}

export interface AudioReactiveColor {
  base: [number, number, number]; // HSL base color
  bassInfluence: number;          // How much bass affects this color
  midInfluence: number;           // How much mids affect this color
  trebleInfluence: number;        // How much treble affects this color
  energyInfluence: number;        // How much overall energy affects this color
  saturationRange: [number, number]; // Min/max saturation
  lightnessRange: [number, number];  // Min/max lightness
}

// Enhanced color palette with audio reactivity
export const colorPalette: ColorPalette = {
  // Base colors
  primary: 'hsl(160, 84%, 39%)',     // Emerald
  secondary: 'hsl(263, 70%, 50%)',   // Purple
  accent: 'hsl(45, 93%, 47%)',       // Gold
  
  // Semantic colors
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  error: 'hsl(0, 84%, 60%)',
  info: 'hsl(217, 91%, 60%)',
  
  // Neutrals (rich, warm blacks)
  background: 'hsl(240, 10%, 4%)',   // Almost black with slight blue
  surface: 'hsl(240, 6%, 10%)',      // Dark surface
  border: 'hsl(240, 5%, 20%)',       // Subtle borders
  text: {
    primary: 'hsl(0, 0%, 95%)',      // Almost white
    secondary: 'hsl(240, 5%, 70%)',  // Medium gray
    tertiary: 'hsl(240, 5%, 50%)',   // Darker gray
  },
  
  // Audio-reactive base colors
  reactive: {
    bass: 'hsl(14, 100%, 50%)',      // Warm orange for bass
    mid: 'hsl(160, 84%, 39%)',       // Emerald for mids  
    treble: 'hsl(210, 100%, 70%)',   // Cool blue for treble
    energy: 'hsl(45, 93%, 47%)',     // Gold for energy
  }
};

// Audio-reactive color definitions
export const audioReactiveColors: Record<string, AudioReactiveColor> = {
  // Track colors that react to audio
  trackO: {
    base: [0, 84, 60],        // Red base
    bassInfluence: 0.8,
    midInfluence: 0.3,
    trebleInfluence: 0.1,
    energyInfluence: 0.5,
    saturationRange: [60, 90],
    lightnessRange: [40, 70]
  },
  
  trackR: {
    base: [217, 91, 60],      // Blue base
    bassInfluence: 0.2,
    midInfluence: 0.6,
    trebleInfluence: 0.8,
    energyInfluence: 0.4,
    saturationRange: [70, 95],
    lightnessRange: [45, 75]
  },
  
  trackB: {
    base: [142, 76, 36],      // Green base
    bassInfluence: 0.4,
    midInfluence: 0.8,
    trebleInfluence: 0.3,
    energyInfluence: 0.6,
    saturationRange: [65, 85],
    lightnessRange: [35, 65]
  },
  
  trackI: {
    base: [45, 93, 47],       // Yellow base
    bassInfluence: 0.6,
    midInfluence: 0.4,
    trebleInfluence: 0.7,
    energyInfluence: 0.8,
    saturationRange: [80, 100],
    lightnessRange: [40, 70]
  },
  
  // Background ambience
  background: {
    base: [240, 10, 4],       // Dark background base
    bassInfluence: 0.3,
    midInfluence: 0.1,
    trebleInfluence: 0.05,
    energyInfluence: 0.2,
    saturationRange: [5, 20],
    lightnessRange: [3, 8]
  },
  
  // UI accents
  accent: {
    base: [160, 84, 39],      // Emerald accent
    bassInfluence: 0.2,
    midInfluence: 0.4,
    trebleInfluence: 0.6,
    energyInfluence: 0.7,
    saturationRange: [70, 90],
    lightnessRange: [35, 55]
  }
};

// Typography system
export const typography = {
  // Font families
  fonts: {
    heading: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    body: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace'
  },
  
  // Font sizes (fluid typography)
  sizes: {
    xs: 'clamp(0.75rem, 0.5vw + 0.625rem, 0.875rem)',
    sm: 'clamp(0.875rem, 0.5vw + 0.75rem, 1rem)',
    base: 'clamp(1rem, 0.75vw + 0.875rem, 1.125rem)',
    lg: 'clamp(1.125rem, 1vw + 1rem, 1.25rem)',
    xl: 'clamp(1.25rem, 1.5vw + 1.125rem, 1.5rem)',
    '2xl': 'clamp(1.5rem, 2vw + 1.25rem, 2rem)',
    '3xl': 'clamp(1.875rem, 3vw + 1.5rem, 2.5rem)',
    '4xl': 'clamp(2.25rem, 4vw + 1.875rem, 3rem)',
    '5xl': 'clamp(3rem, 5vw + 2.25rem, 4rem)'
  },
  
  // Font weights
  weights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900
  },
  
  // Line heights
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75
  }
};

// Spacing system (geometric progression)
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  28: '7rem',        // 112px
  32: '8rem',        // 128px
  36: '9rem',        // 144px
  40: '10rem',       // 160px
  44: '11rem',       // 176px
  48: '12rem',       // 192px
  52: '13rem',       // 208px
  56: '14rem',       // 224px
  60: '15rem',       // 240px
  64: '16rem',       // 256px
  72: '18rem',       // 288px
  80: '20rem',       // 320px
  96: '24rem'        // 384px
};

// Border radius system
export const borderRadius = {
  none: '0',
  sm: '0.125rem',    // 2px
  base: '0.25rem',   // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  '3xl': '1.5rem',   // 24px
  full: '9999px'
};

// Shadow system
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  
  // Audio-reactive shadows
  glow: '0 0 20px rgb(var(--glow-color) / 0.5)',
  pulse: '0 0 0 0 rgb(var(--pulse-color) / 0.7)',
  
  // Inner shadows
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.06)',
  innerLg: 'inset 0 4px 8px 0 rgb(0 0 0 / 0.12)'
};

// Animation utilities
export const animations = {
  // Durations
  durations: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '750ms',
    slowest: '1000ms'
  },
  
  // Easing functions (spring physics)
  easings: {
    linear: 'linear',
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    
    // Spring physics
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    springOut: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    
    // Bounce
    bounce: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)'
  }
};

// Audio-reactive color calculation
export function calculateAudioReactiveColor(
  colorKey: string,
  audioData: AudioAnalysisData
): string {
  const colorDef = audioReactiveColors[colorKey];
  if (!colorDef) return colorPalette.primary;
  
  const [baseH, baseS, baseL] = colorDef.base;
  
  // Calculate influences
  const bassInfluence = audioData.bass * colorDef.bassInfluence;
  const midInfluence = audioData.mid * colorDef.midInfluence;
  const trebleInfluence = audioData.treble * colorDef.trebleInfluence;
  const energyInfluence = audioData.energy * colorDef.energyInfluence;
  
  // Combine influences
  const totalInfluence = bassInfluence + midInfluence + trebleInfluence + energyInfluence;
  
  // Adjust saturation and lightness based on audio
  const [minSat, maxSat] = colorDef.saturationRange;
  const [minLight, maxLight] = colorDef.lightnessRange;
  
  const saturation = minSat + (totalInfluence * (maxSat - minSat));
  const lightness = minLight + (totalInfluence * (maxLight - minLight));
  
  // Slight hue shift based on frequency content
  const hueShift = (audioData.brightness - audioData.warmth) * 10;
  const adjustedHue = (baseH + hueShift) % 360;
  
  return `hsl(${adjustedHue}, ${saturation}%, ${lightness}%)`;
}

// Background color temperature calculation
export function calculateBackgroundTemperature(audioData: AudioAnalysisData): string {
  const baseTemp = audioData.warmth > audioData.brightness ? 'warm' : 'cool';
  const intensity = Math.min(1, audioData.smoothEnergy * 2);
  
  if (baseTemp === 'warm') {
    // Warm orange/red tones
    const hue = 15 + (audioData.bass * 20);
    const sat = 5 + (intensity * 15);
    const light = 3 + (intensity * 5);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  } else {
    // Cool blue/purple tones
    const hue = 220 + (audioData.treble * 40);
    const sat = 8 + (intensity * 12);
    const light = 4 + (intensity * 4);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }
}

// Utility function to interpolate between colors
export function interpolateColors(
  color1: string,
  color2: string,
  factor: number
): string {
  // Simple RGB interpolation for now
  // In a real implementation, you'd want HSL interpolation
  factor = Math.max(0, Math.min(1, factor));
  
  // Extract RGB values (simplified - assumes rgb() format)
  const rgb1 = color1.match(/\d+/g)?.map(Number) || [0, 0, 0];
  const rgb2 = color2.match(/\d+/g)?.map(Number) || [0, 0, 0];
  
  const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * factor);
  const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * factor);
  const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * factor);
  
  return `rgb(${r}, ${g}, ${b})`;
}

// CSS custom properties generator
export function generateCSSCustomProperties(audioData?: AudioAnalysisData): Record<string, string> {
  const properties: Record<string, string> = {
    // Base colors
    '--color-primary': colorPalette.primary,
    '--color-secondary': colorPalette.secondary,
    '--color-accent': colorPalette.accent,
    
    // Semantic colors
    '--color-success': colorPalette.success,
    '--color-warning': colorPalette.warning,
    '--color-error': colorPalette.error,
    '--color-info': colorPalette.info,
    
    // Neutrals
    '--color-background': colorPalette.background,
    '--color-surface': colorPalette.surface,
    '--color-border': colorPalette.border,
    '--color-text-primary': colorPalette.text.primary,
    '--color-text-secondary': colorPalette.text.secondary,
    '--color-text-tertiary': colorPalette.text.tertiary,
    
    // Spacing
    ...Object.entries(spacing).reduce((acc, [key, value]) => {
      acc[`--spacing-${key}`] = value;
      return acc;
    }, {} as Record<string, string>),
    
    // Border radius
    ...Object.entries(borderRadius).reduce((acc, [key, value]) => {
      acc[`--radius-${key}`] = value;
      return acc;
    }, {} as Record<string, string>),
    
    // Animation durations
    ...Object.entries(animations.durations).reduce((acc, [key, value]) => {
      acc[`--duration-${key}`] = value;
      return acc;
    }, {} as Record<string, string>)
  };
  
  // Add audio-reactive properties if audio data is available
  if (audioData) {
    properties['--color-track-o'] = calculateAudioReactiveColor('trackO', audioData);
    properties['--color-track-r'] = calculateAudioReactiveColor('trackR', audioData);
    properties['--color-track-b'] = calculateAudioReactiveColor('trackB', audioData);
    properties['--color-track-i'] = calculateAudioReactiveColor('trackI', audioData);
    properties['--color-background-reactive'] = calculateBackgroundTemperature(audioData);
    
    // Audio data for other components
    properties['--audio-energy'] = audioData.energy.toString();
    properties['--audio-bass'] = audioData.bass.toString();
    properties['--audio-treble'] = audioData.treble.toString();
    properties['--audio-brightness'] = audioData.brightness.toString();
    properties['--audio-warmth'] = audioData.warmth.toString();
  }
  
  return properties;
}

const designSystem = {
  colors: colorPalette,
  audioReactiveColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
  calculateAudioReactiveColor,
  calculateBackgroundTemperature,
  interpolateColors,
  generateCSSCustomProperties
};

export default designSystem;