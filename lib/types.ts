export interface Step {
  id: string;
  active: boolean;
  gain: number;
  prob: number;
  prompt: string;
  buffer: AudioBuffer | null;
  name: string;
  condition?: string;
}

export interface Track {
  id: string;
  name: string;
  radius: number;
  color: string;
  steps: Step[];
  volume: number;
  muted: boolean;
  solo: boolean;
  gainNode?: GainNode;
}

export interface SampleLibraryItem {
  id: string;
  name: string;
  buffer: AudioBuffer;
  duration: number;
  type: 'local' | 'ai';
  prompt?: string;
  seed?: number;
}

export interface GenerationQueueItem {
  id: string;
  prompt: string;
  status: 'queued' | 'generating' | 'ready' | 'error';
  progress?: number;
  trackId?: string; // Track this generation is for
}

export interface AudioState {
  tracks: Track[];
  library: SampleLibraryItem[];
  genQueue: GenerationQueueItem[];
  audioCache: Map<string, SampleLibraryItem>;
  selectedTrack: string | null;
  selectedStep: number | null;
}
