import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from 'axios';
import { useAudioStore } from '@/lib/audioStore';
import { StepEditor } from './StepEditor';
import { SampleLibrary } from './SampleLibrary';
import { GenerationQueue } from './GenerationQueue';
import { TransportControls } from './TransportControls';
import { TrackControls } from './TrackControls';
import { SamplePackSelector } from './SamplePackSelector';
import { StartupHelper } from './StartupHelper';
import { EnhancedSequencer } from './EnhancedSequencer';
import { Tooltip, KeyboardShortcutTooltip } from './ui/Tooltip';
import { KeyboardShortcutsHelp } from './ui/KeyboardShortcutsHelp';
import { CollapsiblePanel } from './ui/CollapsiblePanel';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { deg2rad, rid } from '@/lib/utils';
import { SampleLibraryItem } from '@/lib/types';
import { getApiUrl, config, audioDebugLog, generationDebugLog } from '@/lib/config';
import { generateStaticSample } from '@/lib/staticSamples';
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS, getKeyboardShortcutDescription } from '@/lib/useKeyboardShortcuts';

const STEP_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Q', 'W', 'E', 'R', 'T', 'Y'];

const STEPS_COUNT = 16;
const RADIUS = 160;
const CENTER = { x: 220, y: 220 };

// How long a completed generation-queue item lingers before being pruned (M3)
const QUEUE_ITEM_TTL = 5000; // milliseconds

// Audio Engine Hook for Memory Management
function useAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const schedulerTimerRef = useRef<number | null>(null);
  const currentStepRef = useRef<number>(0);
  const nextNoteTimeRef = useRef<number>(0);
  // Registry of currently-live source nodes so playback can be hard-stopped (H5)
  const liveSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  // requestAnimationFrame handle that drives the visible playhead (H6)
  const rafRef = useRef<number | null>(null);
  // Memoized reversed buffers keyed by source buffer (M4)
  const reverseCacheRef = useRef<WeakMap<AudioBuffer, AudioBuffer>>(new WeakMap());
  const lookAhead = config.audioLookAhead; // milliseconds
  const scheduleAheadTime = config.audioScheduleAhead; // seconds

  // Stop and disconnect every live source, then clear the registry (H5)
  const stopAllSources = useCallback(() => {
    liveSourcesRef.current.forEach((source) => {
      try {
        source.onended = null;
        source.stop();
      } catch (e) {
        // Web Audio throws if the source already stopped — safe to ignore
      }
      try {
        source.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    });
    liveSourcesRef.current.clear();
  }, []);

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        
        // Create master gain node
        masterGainRef.current = audioContextRef.current.createGain();
        masterGainRef.current.connect(audioContextRef.current.destination);
        masterGainRef.current.gain.value = 0.9;
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error);
        throw error;
      }
    }
    return audioContextRef.current;
  }, []);

  const cleanup = useCallback(() => {
    if (schedulerTimerRef.current) {
      clearTimeout(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    stopAllSources();

    if (masterGainRef.current) {
      masterGainRef.current.disconnect();
      masterGainRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    audioContextRef,
    masterGainRef,
    schedulerTimerRef,
    currentStepRef,
    nextNoteTimeRef,
    liveSourcesRef,
    rafRef,
    reverseCacheRef,
    initAudioContext,
    cleanup,
    stopAllSources,
    lookAhead,
    scheduleAheadTime
  };
}

export default function OrbitrSequencer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [reverse, setReverse] = useState(false);
  const [masterGain, setMasterGain] = useState(0.9);
  const [swing, setSwing] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  
  const audioEngine = useAudioEngine();

  const {
    tracks,
    library,
    genQueue,
    selectedTrack,
    selectedStep,
    updateStep,
    toggleStep,
    toggleStepMulti,
    addToLibrary,
    assignToStep,
    assignToStepMulti,
    addToQueue,
    updateQueueItem,
    removeFromQueue,
    audioCache,
    clearStep,
    clearStepMulti,
    setSelectedTrack,
    setSelectedStep,
    setTrackVolume,
    setTrackMute,
    setTrackSolo,
    clearTrack,
    setLoading,
    setError,
    clearError
  } = useAudioStore();
  const tracksRef = useRef(tracks);
  const bpmRef = useRef(bpm);
  const swingRef = useRef(swing);
  const reverseRef = useRef(reverse);
  // Pending queue-prune timers, tracked so they can be cleared on unmount
  // instead of firing store mutations after the component is gone (M3 cleanup).
  const pruneTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Get current track's steps
  const currentTrackSteps = useMemo(() => {
    if (selectedTrack) {
      const track = tracks.find(t => t.id === selectedTrack);
      return track?.steps || [];
    }
    return tracks[0]?.steps || [];
  }, [tracks, selectedTrack]);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    swingRef.current = swing;
  }, [swing]);

  useEffect(() => {
    reverseRef.current = reverse;
  }, [reverse]);

  const reverseBuffer = useCallback((buffer: AudioBuffer): AudioBuffer => {
    if (!audioEngine.audioContextRef.current) return buffer;

    // Reuse a previously reversed buffer if we already computed one (M4).
    // WeakMap keys are GC'd along with their source buffers, so no manual invalidation.
    const cached = audioEngine.reverseCacheRef.current.get(buffer);
    if (cached) return cached;

    const ctx = audioEngine.audioContextRef.current;
    const reversedBuffer = ctx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      const reversedData = reversedBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        reversedData[i] = channelData[channelData.length - 1 - i];
      }
    }

    audioEngine.reverseCacheRef.current.set(buffer, reversedBuffer);
    return reversedBuffer;
  }, [audioEngine.audioContextRef, audioEngine.reverseCacheRef]);

  // Audio scheduling functions
  const scheduleNote = useCallback((buffer: AudioBuffer, time: number, gain: number = 1) => {
    if (!audioEngine.audioContextRef.current || !audioEngine.masterGainRef.current) return;

    try {
      const source = audioEngine.audioContextRef.current.createBufferSource();
      const gainNode = audioEngine.audioContextRef.current.createGain();
      
      source.buffer = reverseRef.current ? reverseBuffer(buffer) : buffer;
      source.connect(gainNode);
      gainNode.connect(audioEngine.masterGainRef.current);
      gainNode.gain.value = gain;
      
      source.start(time);

      // Track the live source so stopPlayback/unmount can hard-stop it (H5)
      audioEngine.liveSourcesRef.current.add(source);

      // Cleanup after playback — rely on onended rather than a fixed timeout so
      // samples longer than maxPreviewDuration are not truncated (H5).
      source.onended = () => {
        audioEngine.liveSourcesRef.current.delete(source);
        try {
          gainNode.disconnect();
          source.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
      };
    } catch (error) {
      audioDebugLog('Failed to schedule note', error);
    }
  }, [audioEngine.audioContextRef, audioEngine.masterGainRef, audioEngine.liveSourcesRef, reverseBuffer]);

  const scheduler = useCallback(() => {
    if (!audioEngine.audioContextRef.current) return;
    
    const currentTime = audioEngine.audioContextRef.current.currentTime;
    
    while (audioEngine.nextNoteTimeRef.current < currentTime + audioEngine.scheduleAheadTime) {
      const stepIndex = audioEngine.currentStepRef.current;
      const currentTracks = tracksRef.current;
      const currentSwing = swingRef.current;
      const currentBpm = bpmRef.current;
      const hasSoloTracks = currentTracks.some(t => t.solo);
      const stepDuration = 60.0 / currentBpm / 4; // 16th notes

      // Schedule notes for all tracks
      currentTracks.forEach(track => {
        if (track.muted) return;

        if (hasSoloTracks && !track.solo) return;

        const step = track.steps[stepIndex];
        if (step.active && step.buffer && Math.random() < step.prob) {
          // Swing as a fraction of the step duration so it scales with tempo (M2)
          const swingDelay = (stepIndex % 2) * currentSwing * stepDuration * 0.5;
          scheduleNote(
            step.buffer,
            audioEngine.nextNoteTimeRef.current + swingDelay,
            step.gain * track.volume
          );
        }
      });

      // Advance to next step. Keep the authoritative step in a ref; the visible
      // currentStep state is driven by a rAF loop to avoid a re-render storm (H6).
      audioEngine.nextNoteTimeRef.current += stepDuration;
      audioEngine.currentStepRef.current = (audioEngine.currentStepRef.current + 1) % STEPS_COUNT;
    }

    audioEngine.schedulerTimerRef.current = window.setTimeout(scheduler, audioEngine.lookAhead);
  }, [audioEngine, scheduleNote]);

  // Drive the visible playhead from a single rAF loop, updating React state at
  // most once per frame and only when the step actually changed (H6).
  const playheadLoop = useCallback(() => {
    setCurrentStep((prev) =>
      prev === audioEngine.currentStepRef.current ? prev : audioEngine.currentStepRef.current
    );
    audioEngine.rafRef.current = requestAnimationFrame(playheadLoop);
  }, [audioEngine.currentStepRef, audioEngine.rafRef]);

  const startPlayback = useCallback(async () => {
    try {
      audioDebugLog('startPlayback called');
      await audioEngine.initAudioContext();
      if (!audioEngine.audioContextRef.current) throw new Error('Failed to initialize audio context');

      audioDebugLog('Audio context initialized, starting scheduler');
      audioEngine.nextNoteTimeRef.current = audioEngine.audioContextRef.current.currentTime;
      audioEngine.currentStepRef.current = 0;
      scheduler();
      // Start the playhead rAF loop (H6)
      if (audioEngine.rafRef.current === null) {
        audioEngine.rafRef.current = requestAnimationFrame(playheadLoop);
      }
      audioDebugLog('Scheduler started');
    } catch (error) {
      audioDebugLog('startPlayback error', error);
      // Don't reset state on audio context error - keep UI state as playing
      // The user should see the button shows "playing" even if audio doesn't work
      audioDebugLog('Audio failed but keeping UI in playing state');
    }
  }, [audioEngine, scheduler, playheadLoop]);

  const stopPlayback = useCallback(() => {
    audioDebugLog('stopPlayback called - this will set isPlaying to false');
    if (audioEngine.schedulerTimerRef.current) {
      clearTimeout(audioEngine.schedulerTimerRef.current);
      audioEngine.schedulerTimerRef.current = null;
    }
    // Cancel the playhead rAF loop (H6)
    if (audioEngine.rafRef.current !== null) {
      cancelAnimationFrame(audioEngine.rafRef.current);
      audioEngine.rafRef.current = null;
    }
    // Hard-stop any sources already scheduled ahead so playback truly stops (H5)
    audioEngine.stopAllSources();
    setIsPlaying(false);
    audioEngine.currentStepRef.current = 0;
    setCurrentStep(0);
  }, [audioEngine]);

  const togglePlayback = useCallback(async () => {
    console.log('togglePlayback called, isPlaying:', isPlaying);
    if (isPlaying) {
      console.log('Calling stopPlayback');
      stopPlayback();
    } else {
      console.log('Calling startPlayback');
      // Test immediate state update first
      console.log('About to call setIsPlaying(true) in togglePlayback');
      setIsPlaying(true);
      console.log('Called setIsPlaying(true) in togglePlayback');
      await startPlayback();
    }
  }, [isPlaying, startPlayback, stopPlayback]);

  // Handle master gain changes
  useEffect(() => {
    if (audioEngine.masterGainRef.current) {
      audioEngine.masterGainRef.current.gain.value = masterGain;
    }
  }, [masterGain, audioEngine.masterGainRef]);

  // File upload handler with error handling
  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!audioEngine.audioContextRef.current) {
      await audioEngine.initAudioContext();
    }
    
    const ctx = audioEngine.audioContextRef.current!;
    
    for (const file of files) {
      try {
        setLoading(true, `Processing ${file.name}...`);
        
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        
        const item: SampleLibraryItem = {
          id: rid(),
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          buffer: audioBuffer,
          duration: audioBuffer.duration,
          type: 'local'
        };
        
        addToLibrary(item);
      } catch (error) {
        setError(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    setLoading(false);
  }, [audioEngine, addToLibrary, setLoading, setError]);

  // Schedule a completed/failed queue item to be pruned after QUEUE_ITEM_TTL,
  // tracking the timer so it can be cancelled on unmount (the timer is removed
  // from the tracking set when it fires).
  const schedulePrune = useCallback((genId: string) => {
    const timer = setTimeout(() => {
      pruneTimersRef.current.delete(timer);
      removeFromQueue(genId);
    }, QUEUE_ITEM_TTL);
    pruneTimersRef.current.add(timer);
  }, [removeFromQueue]);

  // Generation handler with environment-based API URL
  const handleGenerate = useCallback(async (prompt: string, stepIdx?: number, options: any = {}) => {
    generationDebugLog('Starting generation', { prompt, stepIdx, options });

    // Capture the unique queue id in the closure so success/error paths update
    // and prune THIS exact item, even when prompts collide (M3).
    const genId = rid();

    try {
      if (!audioEngine.audioContextRef.current) {
        await audioEngine.initAudioContext();
      }

      addToQueue({
        id: genId,
        prompt,
        status: 'generating',
        progress: 0,
        trackId: selectedTrack || undefined
      });
      
      setLoading(true, 'Generating audio...');
      
      let item: SampleLibraryItem;
      
      if (config.isStaticMode) {
        // Use static generation for GitHub Pages
        item = await generateStaticSample(prompt);
      } else {
        // Use backend API for full deployment
        const apiUrl = getApiUrl();
        const response = await axios.post(`${apiUrl}/generate`, {
          prompt,
          quality: options.quality === 'high' ? 'high' : 'draft',
          duration: 8,
          cfg_coef: 7.5
        });
        
        const audioData = response.data.audio;
        const audioBuffer = await audioEngine.audioContextRef.current!.decodeAudioData(
          Uint8Array.from(atob(audioData), c => c.charCodeAt(0)).buffer
        );
        
        item = {
          id: rid(),
          name: `AI: ${prompt.slice(0, 20)}${prompt.length > 20 ? '...' : ''}`,
          buffer: audioBuffer,
          duration: audioBuffer.duration,
          type: 'ai',
          prompt
        };
      }
      
      addToLibrary(item);
      updateQueueItem(genId, { status: 'ready', progress: 100 });

      // Auto-assign if step specified
      if (stepIdx !== undefined && selectedTrack) {
        assignToStepMulti(selectedTrack, stepIdx, item.id);
      }

      // Prune the completed item shortly after so the queue can't grow
      // unbounded across a session (M3)
      schedulePrune(genId);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Generation failed';
      setError(`AI generation failed: ${errorMsg}`);

      // Update THIS exact queue item by its unique id, not by prompt match,
      // so concurrent generations sharing a prompt don't clobber each other (M3)
      updateQueueItem(genId, { status: 'error' });
      schedulePrune(genId);
    } finally {
      setLoading(false);
    }
  }, [audioEngine, addToQueue, addToLibrary, assignToStepMulti, selectedTrack, updateQueueItem, schedulePrune, setLoading, setError]);

  // Keyboard shortcuts handlers
  const handleGenerateShortcut = useCallback(() => {
    if (selectedTrack && selectedStep !== null) {
      const prompt = `Generated sample for track ${selectedTrack} step ${selectedStep + 1}`;
      handleGenerate(prompt, selectedStep);
    }
  }, [selectedTrack, selectedStep, handleGenerate]);

  const handleClear = useCallback(() => {
    if (selectedTrack && selectedStep !== null) {
      clearStepMulti(selectedTrack, selectedStep);
    }
  }, [selectedTrack, selectedStep, clearStepMulti]);

  const handleReverse = useCallback(() => {
    setReverse(prev => !prev);
  }, []);

  const handleStepSelect = useCallback((stepIndex: number) => {
    setSelectedStep(stepIndex);
  }, [setSelectedStep]);

  const handleBpmAdjust = useCallback((direction: 'increase' | 'decrease') => {
    setBpm(prev => {
      const delta = direction === 'increase' ? 5 : -5;
      return Math.max(40, Math.min(200, prev + delta));
    });
  }, []);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onPlayStop: togglePlayback,
    onGenerate: handleGenerateShortcut,
    onClear: handleClear,
    onReverse: handleReverse,
    onStepSelect: handleStepSelect,
    onBpmAdjust: handleBpmAdjust
  });

  // Cleanup on unmount only
  useEffect(() => {
    // Capture the (stable, lifetime-long) prune-timer set so the cleanup below
    // clears the same instance it accumulated into.
    const pruneTimers = pruneTimersRef.current;
    return () => {
      // Access current values directly to avoid dependency issues
      if (audioEngine.schedulerTimerRef.current) {
        clearTimeout(audioEngine.schedulerTimerRef.current);
        audioEngine.schedulerTimerRef.current = null;
      }
      // Cancel any pending queue-prune timers so they don't mutate the store
      // after unmount (M3 cleanup).
      pruneTimers.forEach(clearTimeout);
      pruneTimers.clear();
      // cleanup() cancels the rAF loop and hard-stops every live source (H5/H6)
      setIsPlaying(false);
      audioEngine.currentStepRef.current = 0;
      setCurrentStep(0);
      audioEngine.cleanup();
    };
  }, []); // Empty dependency array - only run on mount/unmount

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <header className="text-center mb-8 relative">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 to-purple-500 bg-clip-text text-transparent mb-2">
          ORBITR
        </h1>
        <p className="text-zinc-400">Multi-track circular sequencer with AI sample generation</p>
        
        {/* Keyboard Shortcuts Help */}
        <div className="absolute top-0 right-0">
          <KeyboardShortcutsHelp />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Sequencer Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enhanced Circular Sequencer Visualization */}
          <EnhancedSequencer
            isPlaying={isPlaying}
            currentStep={currentStep}
            onStepClick={(trackId, stepIndex) => {
              setSelectedTrack(trackId);
              setSelectedStep(stepIndex);
            }}
            onPlayheadClick={togglePlayback}
            audioContext={audioEngine.audioContextRef.current || undefined}
            audioSource={audioEngine.masterGainRef.current || undefined}
          />
          
          {/* Transport Controls */}
          <TransportControls
            isPlaying={isPlaying}
            onPlayStop={togglePlayback}
            bpm={bpm}
            onBpmChange={setBpm}
            reverse={reverse}
            onReverseChange={setReverse}
            swing={swing}
            onSwingChange={setSwing}
            masterGain={masterGain}
            onMasterGainChange={setMasterGain}
          />
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          <CollapsiblePanel title="Track Controls" defaultOpen={true}>
            <TrackControls
              tracks={tracks}
              selectedTrack={selectedTrack}
              onSelectTrack={setSelectedTrack}
              onVolumeChange={setTrackVolume}
              onMuteToggle={(trackId) => {
                const track = tracks.find(t => t.id === trackId);
                if (track) setTrackMute(trackId, !track.muted);
              }}
              onSoloToggle={(trackId) => {
                const track = tracks.find(t => t.id === trackId);
                if (track) setTrackSolo(trackId, !track.solo);
              }}
              onClearTrack={clearTrack}
            />
          </CollapsiblePanel>

          <CollapsiblePanel title="Sample Packs" defaultOpen={false}>
            <SamplePackSelector
              embedded
              hideHeader
              onPackLoad={(packId) => {
                console.log(`Loaded sample pack: ${packId}`);
              }}
            />
          </CollapsiblePanel>

          <CollapsiblePanel title="Step Editor" defaultOpen={true}>
            <StepEditor
              embedded
              hideHeader
              steps={currentTrackSteps}
              onStepChange={updateStep}
              onAssign={assignToStep}
              onGenerate={handleGenerate}
              onClear={(stepIdx: number) => {
                if (selectedTrack) {
                  clearStepMulti(selectedTrack, stepIdx);
                }
              }}
              library={library}
            />
          </CollapsiblePanel>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CollapsiblePanel title="Sample Library" defaultOpen={false}>
          <ErrorBoundary name="Sample Library">
            <SampleLibrary
              embedded
              hideHeader
              library={library}
              onFileUpload={handleFileUpload}
            />
          </ErrorBoundary>
        </CollapsiblePanel>

        <CollapsiblePanel title="Generation Queue" defaultOpen={true}>
          <GenerationQueue embedded hideHeader queue={genQueue} />
        </CollapsiblePanel>
      </div>
      
      {/* Startup Helper */}
      <StartupHelper />
    </div>
  );
}
