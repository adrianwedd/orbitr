import { create } from 'zustand';
import { Step, Track, SampleLibraryItem, GenerationQueueItem } from './types';
import { rid } from './utils';

interface AudioStore {
  tracks: Track[];
  library: SampleLibraryItem[];
  genQueue: GenerationQueueItem[];
  audioCache: Map<string, SampleLibraryItem>;
  selectedTrack: string | null;
  selectedStep: number | null;
  
  // Playback state
  currentStep: number;
  isPlaying: boolean;
  bpm: number;
  swing: number;
  masterGain: number;
  
  // Loading states
  isLoading: boolean;
  loadingMessage: string;
  errorMessage: string | null;
  
  // Track Actions
  updateStepMulti: (trackId: string, stepIdx: number, patch: Partial<Step>) => void;
  toggleStepMulti: (trackId: string, stepIdx: number) => void;
  clearStepMulti: (trackId: string, stepIdx: number) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackMute: (trackId: string, muted: boolean) => void;
  setTrackSolo: (trackId: string, solo: boolean) => void;
  clearTrack: (trackId: string) => void;
  
  // Selection Actions
  setSelectedTrack: (trackId: string | null) => void;
  setSelectedStep: (stepIdx: number | null) => void;
  
  // Library Actions
  addToLibrary: (item: SampleLibraryItem) => void;
  addToSampleLibrary: (item: SampleLibraryItem) => void; // Alias for compatibility
  removeFromSampleLibrary: (id: string) => void;
  clearLibrary: () => void;
  clearSampleLibrary: () => void; // Alias for clearLibrary
  assignToStepMulti: (trackId: string, stepIdx: number, libId: string) => void;
  addToQueue: (item: GenerationQueueItem) => void;
  updateQueueItem: (id: string, patch: Partial<GenerationQueueItem>) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  addToGenerationQueue: (item: GenerationQueueItem) => void; // Alias for addToQueue
  removeFromGenerationQueue: (id: string) => void; // Alias for removeFromQueue
  updateGenerationProgress: (id: string, progress: number, status: string) => void;
  
  // Playback Actions
  setCurrentStep: (step: number) => void;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
  togglePlayback: () => void;
  setPlaying: (playing: boolean) => void;
  setIsPlaying: (playing: boolean) => void; // Alias for compatibility
  setMasterGain: (gain: number) => void;
  
  // Legacy compatibility (for existing components)
  track: Step[];
  sampleLibrary: SampleLibraryItem[]; // Alias for integration tests
  generationQueue: GenerationQueueItem[]; // Alias for genQueue
  updateStep: (idx: number, patch: Partial<Step>) => void;
  toggleStep: (idx: number) => void;
  assignToStep: (stepIdx: number, libId: string) => void;
  clearStep: (idx: number) => void;
  
  // Loading state actions
  setLoading: (loading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Legacy track method
  getTrack: () => Step[];
}

const STEPS_COUNT = 16;

const createTrack = (id: string, name: string, radius: number, color: string): Track => ({
  id,
  name,
  radius,
  color,
  volume: 0.8,
  muted: false,
  solo: false,
  steps: Array.from({ length: STEPS_COUNT }, (_, i) => ({
    id: rid(),
    active: false,
    gain: 0.9,
    prob: 1.0,
    prompt: '',
    buffer: null,
    name: `${name} ${i + 1}`,
  })),
});

export const useAudioStore = create<AudioStore>((set, get) => ({
  tracks: [
    createTrack('track1', 'O', 180, '#ef4444'), // Red - Outer
    createTrack('track2', 'R', 150, '#3b82f6'), // Blue
    createTrack('track3', 'B', 120, '#10b981'), // Green  
    createTrack('track4', 'I', 90,  '#f59e0b'), // Yellow - Inner
  ],
  selectedTrack: 'track1',
  selectedStep: null,
  
  library: [],
  genQueue: [],
  audioCache: new Map(),
  
  // Computed property for backwards compatibility
  get sampleLibrary() {
    // In Zustand stores, 'this' refers to the current state
    return this.library;
  },
  
  get generationQueue() {
    return this.genQueue;
  },
  
  // Playback state
  currentStep: 0,
  isPlaying: false,
  bpm: 120,
  swing: 0,
  masterGain: 0.8,
  
  // Loading states
  isLoading: false,
  loadingMessage: '',
  errorMessage: null,
  
  // Multi-track actions
  updateStepMulti: (trackId, stepIdx, patch) =>
    set((state) => ({
      tracks: state.tracks.map(track =>
        track.id === trackId
          ? {
              ...track,
              steps: track.steps.map((step, i) =>
                i === stepIdx ? { ...step, ...patch } : step
              )
            }
          : track
      )
    })),

  toggleStepMulti: (trackId, stepIdx) =>
    set((state) => ({
      tracks: state.tracks.map(track =>
        track.id === trackId
          ? {
              ...track,
              steps: track.steps.map((step, i) =>
                i === stepIdx ? { ...step, active: !step.active } : step
              )
            }
          : track
      )
    })),

  clearStepMulti: (trackId, stepIdx) =>
    set((state) => ({
      tracks: state.tracks.map(track =>
        track.id === trackId
          ? {
              ...track,
              steps: track.steps.map((step, i) =>
                i === stepIdx 
                  ? { ...step, active: false, buffer: null, name: `${track.name} ${i + 1}` }
                  : step
              )
            }
          : track
      )
    })),

  setTrackVolume: (trackId, volume) =>
    set((state) => ({
      tracks: state.tracks.map(track =>
        track.id === trackId ? { ...track, volume } : track
      )
    })),

  setTrackMute: (trackId, muted) =>
    set((state) => ({
      tracks: state.tracks.map(track =>
        track.id === trackId ? { ...track, muted } : track
      )
    })),

  setTrackSolo: (trackId, solo) =>
    set((state) => ({
      tracks: state.tracks.map(track =>
        track.id === trackId ? { ...track, solo } : { ...track, solo: false }
      )
    })),

  clearTrack: (trackId) =>
    set((state) => ({
      tracks: state.tracks.map(track =>
        track.id === trackId
          ? {
              ...track,
              steps: track.steps.map((step, i) => ({
                ...step,
                active: false,
                buffer: null,
                name: `${track.name} ${i + 1}`
              }))
            }
          : track
      )
    })),

  // Selection actions
  setSelectedTrack: (trackId) => set({ selectedTrack: trackId }),
  setSelectedStep: (stepIdx) => set({ selectedStep: stepIdx }),

  // Library actions
  addToLibrary: (item) =>
    set((state) => ({
      library: [item, ...state.library]
    })),

  assignToStepMulti: (trackId, stepIdx, libId) =>
    set((state) => {
      const item = state.library.find((l) => l.id === libId);
      if (!item) return state;
      
      return {
        tracks: state.tracks.map(track =>
          track.id === trackId
            ? {
                ...track,
                steps: track.steps.map((step, i) =>
                  i === stepIdx
                    ? { 
                        ...step, 
                        active: true, 
                        buffer: item.buffer, 
                        name: item.name,
                        prompt: item.prompt || step.prompt
                      }
                    : step
                )
              }
            : track
        )
      };
    }),

  addToQueue: (item) =>
    set((state) => ({
      genQueue: [...state.genQueue, item]
    })),

  updateQueueItem: (id, patch) =>
    set((state) => ({
      genQueue: state.genQueue.map((g) => 
        g.id === id ? { ...g, ...patch } : g
      )
    })),

  removeFromQueue: (id) =>
    set((state) => ({
      genQueue: state.genQueue.filter((g) => g.id !== id)
    })),

  clearQueue: () =>
    set({ genQueue: [] }),

  // Library management methods
  addToSampleLibrary: (item) =>
    set((state) => ({
      library: [item, ...state.library]
    })),

  removeFromSampleLibrary: (id) =>
    set((state) => ({
      library: state.library.filter((item) => item.id !== id)
    })),

  clearLibrary: () =>
    set({ library: [] }),

  // Playback control methods
  setCurrentStep: (step) => set({ currentStep: step }),
  
  setBpm: (bpm) => set({ bpm }),
  
  setSwing: (swing) => set({ swing }),
  
  togglePlayback: () =>
    set((state) => ({ isPlaying: !state.isPlaying })),
  
  setPlaying: (playing) => set({ isPlaying: playing }),
  
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  
  setMasterGain: (gain) => set({ masterGain: gain }),
  
  // Additional alias methods
  clearSampleLibrary: () => set({ library: [] }),
  
  addToGenerationQueue: (item) =>
    set((state) => ({
      genQueue: [...state.genQueue, item]
    })),
  
  removeFromGenerationQueue: (id) =>
    set((state) => ({
      genQueue: state.genQueue.filter((g) => g.id !== id)
    })),
  
  updateGenerationProgress: (id, progress, status) =>
    set((state) => ({
      genQueue: state.genQueue.map((g) => 
        g.id === id ? { ...g, progress, status } : g
      )
    })),

  // Legacy compatibility getters/actions
  get track() {
    const state = get();
    const selectedTrack = state.selectedTrack;
    if (selectedTrack) {
      const track = state.tracks.find(t => t.id === selectedTrack);
      return track?.steps || [];
    }
    return state.tracks[0]?.steps || [];
  },


  // Legacy single-track actions (delegate to selected track for compatibility)
  updateStep: (idx, patch) => {
    const state = get();
    const trackId = state.selectedTrack || state.tracks[0]?.id;
    if (trackId) state.updateStepMulti(trackId, idx, patch);
  },

  toggleStep: (idx) => {
    const state = get();
    const trackId = state.selectedTrack || state.tracks[0]?.id;
    if (trackId) state.toggleStepMulti(trackId, idx);
  },

  assignToStep: (stepIdx, libId) => {
    const state = get();
    const trackId = state.selectedTrack || state.tracks[0]?.id;
    if (trackId) state.assignToStepMulti(trackId, stepIdx, libId);
  },

  clearStep: (idx) => {
    const state = get();
    const trackId = state.selectedTrack || state.tracks[0]?.id;
    if (trackId) state.clearStepMulti(trackId, idx);
  },

  // Loading state actions
  setLoading: (loading, message = '') =>
    set({ isLoading: loading, loadingMessage: message }),

  setError: (error) =>
    set({ errorMessage: error, isLoading: false }),

  clearError: () =>
    set({ errorMessage: null }),

  // Legacy track method
  getTrack: () => {
    const state = get();
    const selectedTrack = state.selectedTrack;
    if (selectedTrack) {
      const track = state.tracks.find(t => t.id === selectedTrack);
      return track?.steps || [];
    }
    return state.tracks[0]?.steps || [];
  },
}));
