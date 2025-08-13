export const clamp = (n: number, min: number, max: number) => 
  Math.max(min, Math.min(max, n));

export const deg2rad = (deg: number) => (deg * Math.PI) / 180;

export const rid = () => Math.random().toString(36).slice(2, 9);

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return mins > 0 ? `${mins}:${secs.padStart(4, '0')}` : `${secs}s`;
};

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

export const euclideanRhythm = (steps: number, pulses: number): boolean[] => {
  const pattern: boolean[] = new Array(steps).fill(false);
  if (pulses >= steps) {
    return new Array(steps).fill(true);
  }
  
  let bucket = Math.floor(steps / pulses);
  let remainder = steps % pulses;
  
  let index = 0;
  for (let i = 0; i < pulses; i++) {
    pattern[index] = true;
    index += bucket + (i < remainder ? 1 : 0);
  }
  
  return pattern;
};
