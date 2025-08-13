/**
 * Application Configuration
 * Handles environment variables and configuration management
 */

export const config = {
  // API Configuration  
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  // GitHub Pages mode - no backend available
  isStaticMode: process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL,
  
  // Audio Configuration
  maxAudioFileSize: parseInt(process.env.NEXT_PUBLIC_MAX_AUDIO_FILE_SIZE || '52428800'), // 50MB
  audioCacheSize: parseInt(process.env.NEXT_PUBLIC_AUDIO_CACHE_SIZE || '100'),
  
  // Debug flags
  debugAudio: process.env.NEXT_PUBLIC_DEBUG_AUDIO === 'true',
  debugGeneration: process.env.NEXT_PUBLIC_DEBUG_GENERATION === 'true',
  
  // Audio Engine Settings
  audioLookAhead: 25.0, // milliseconds
  audioScheduleAhead: 0.1, // seconds
  maxPreviewDuration: 10000, // milliseconds
} as const;

/**
 * Validates API URL and provides fallback
 */
export function getApiUrl(): string {
  const url = config.apiUrl;
  
  // Validate URL format
  try {
    new URL(url);
    return url;
  } catch (error) {
    console.warn(`Invalid API URL: ${url}, falling back to localhost`);
    return 'http://localhost:8000';
  }
}

/**
 * Get environment-specific configuration
 */
export function getEnvironment(): 'development' | 'production' | 'test' {
  if (process.env.NODE_ENV === 'production') return 'production';
  if (process.env.NODE_ENV === 'test') return 'test';
  return 'development';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Debug logger that only logs in development
 */
export function debugLog(message: string, ...args: any[]): void {
  if (isDevelopment() || config.debugAudio) {
    console.log(`[ORBITR DEBUG] ${message}`, ...args);
  }
}

/**
 * Audio debug logger
 */
export function audioDebugLog(message: string, ...args: any[]): void {
  if (config.debugAudio) {
    console.log(`[AUDIO DEBUG] ${message}`, ...args);
  }
}

/**
 * Generation debug logger
 */
export function generationDebugLog(message: string, ...args: any[]): void {
  if (config.debugGeneration) {
    console.log(`[GENERATION DEBUG] ${message}`, ...args);
  }
}