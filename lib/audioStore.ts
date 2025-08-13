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
  assignToStepMulti: (trackId: string, stepIdx: number, libId: string) => void;
  addToQueue: (item: GenerationQueueItem) => void;
  updateQueueItem: (id: string, patch: Partial<GenerationQueueItem>) => void;
  
  // Legacy compatibility (for existing components)
  track: Step[];
  updateStep: (idx: number, patch: Partial<Step>) => void;
  toggleStep: (idx: number) => void;
  assignToStep: (stepIdx: number, libId: string) => void;
  clearStep: (idx: number) => void;
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

  // Legacy compatibility getters/actions
  get track() {
    const state = get();
    return state.selectedTrack ? 
      state.tracks.find(t => t.id === state.selectedTrack)?.steps || [] :
      state.tracks[0]?.steps || [];
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
}));
