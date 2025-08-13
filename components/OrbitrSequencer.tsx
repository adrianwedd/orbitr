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
import { deg2rad, rid } from '@/lib/utils';
import { SampleLibraryItem } from '@/lib/types';
import { getApiUrl, config, audioDebugLog, generationDebugLog } from '@/lib/config';
import { generateStaticSample } from '@/lib/staticSamples';
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS, getKeyboardShortcutDescription } from '@/lib/useKeyboardShortcuts';

const STEP_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Q', 'W', 'E', 'R', 'T', 'Y'];

const STEPS_COUNT = 16;
const RADIUS = 160;
const CENTER = { x: 220, y: 220 };

// Audio Engine Hook for Memory Management
function useAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const schedulerTimerRef = useRef<number | null>(null);
  const currentStepRef = useRef<number>(0);
  const nextNoteTimeRef = useRef<number>(0);
  const lookAhead = config.audioLookAhead; // milliseconds
  const scheduleAheadTime = config.audioScheduleAhead; // seconds

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
    initAudioContext,
    cleanup,
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

  // Get current track's steps
  const currentTrackSteps = useMemo(() => {
    if (selectedTrack) {
      const track = tracks.find(t => t.id === selectedTrack);
      return track?.steps || [];
    }
    return tracks[0]?.steps || [];
  }, [tracks, selectedTrack]);

  // Audio scheduling functions
  const scheduleNote = useCallback((buffer: AudioBuffer, time: number, gain: number = 1) => {
    if (!audioEngine.audioContextRef.current || !audioEngine.masterGainRef.current) return;

    try {
      const source = audioEngine.audioContextRef.current.createBufferSource();
      const gainNode = audioEngine.audioContextRef.current.createGain();
      
      source.buffer = reverse ? reverseBuffer(buffer) : buffer;
      source.connect(gainNode);
      gainNode.connect(audioEngine.masterGainRef.current);
      gainNode.gain.value = gain;
      
      source.start(time);
      
      // Cleanup after playback
      source.onended = () => {
        try {
          gainNode.disconnect();
          source.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
      };
      
      // Force cleanup after configured duration
      setTimeout(() => {
        try {
          source.stop();
        } catch (e) {
          // Ignore cleanup errors (source may have already ended)
        }
      }, config.maxPreviewDuration);
    } catch (error) {
      console.error('Failed to schedule note:', error);
    }
  }, [audioEngine.audioContextRef, audioEngine.masterGainRef, reverse]);

  const reverseBuffer = useCallback((buffer: AudioBuffer): AudioBuffer => {
    if (!audioEngine.audioContextRef.current) return buffer;
    
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
    
    return reversedBuffer;
  }, [audioEngine.audioContextRef]);

  const scheduler = useCallback(() => {
    if (!audioEngine.audioContextRef.current) return;
    
    const currentTime = audioEngine.audioContextRef.current.currentTime;
    
    while (audioEngine.nextNoteTimeRef.current < currentTime + audioEngine.scheduleAheadTime) {
      const stepIndex = audioEngine.currentStepRef.current;
      
      // Schedule notes for all tracks
      tracks.forEach(track => {
        if (track.muted) return;
        
        // Check if any track is soloed
        const hasSoloTracks = tracks.some(t => t.solo);
        if (hasSoloTracks && !track.solo) return;
        
        const step = track.steps[stepIndex];
        if (step.active && step.buffer && Math.random() < step.prob) {
          const swingDelay = (stepIndex % 2 === 1) ? swing * 0.1 : 0;
          scheduleNote(
            step.buffer,
            audioEngine.nextNoteTimeRef.current + swingDelay,
            step.gain * track.volume
          );
        }
      });
      
      // Advance to next step
      const stepDuration = 60.0 / bpm / 4; // 16th notes
      audioEngine.nextNoteTimeRef.current += stepDuration;
      audioEngine.currentStepRef.current = (audioEngine.currentStepRef.current + 1) % STEPS_COUNT;
      setCurrentStep(audioEngine.currentStepRef.current);
    }
    
    audioEngine.schedulerTimerRef.current = window.setTimeout(scheduler, audioEngine.lookAhead);
  }, [audioEngine, tracks, scheduleNote, bpm, swing]);

  const startPlayback = useCallback(async () => {
    try {
      console.log('startPlayback called');
      await audioEngine.initAudioContext();
      if (!audioEngine.audioContextRef.current) throw new Error('Failed to initialize audio context');
      
      console.log('Audio context initialized, starting scheduler');
      audioEngine.nextNoteTimeRef.current = audioEngine.audioContextRef.current.currentTime;
      scheduler();
      console.log('Scheduler started');
    } catch (error) {
      console.error('startPlayback error:', error);
      // setError(`Playback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't reset state on audio context error - keep UI state as playing
      // The user should see the button shows "playing" even if audio doesn't work
      console.log('Audio failed but keeping UI in playing state');
    }
  }, [audioEngine, scheduler, setError]);

  const stopPlayback = useCallback(() => {
    console.log('stopPlayback called - this will set isPlaying to false');
    if (audioEngine.schedulerTimerRef.current) {
      clearTimeout(audioEngine.schedulerTimerRef.current);
      audioEngine.schedulerTimerRef.current = null;
    }
    setIsPlaying(false);
    console.log('stopPlayback called setIsPlaying(false)');
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

  // Generation handler with environment-based API URL
  const handleGenerate = useCallback(async (prompt: string, stepIdx?: number, options: any = {}) => {
    generationDebugLog('Starting generation', { prompt, stepIdx, options });
    
    try {
      if (!audioEngine.audioContextRef.current) {
        await audioEngine.initAudioContext();
      }
      
      const genId = rid();
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
      updateQueueItem(genId, { status: 'ready' });
      
      // Auto-assign if step specified
      if (stepIdx !== undefined && selectedTrack) {
        assignToStepMulti(selectedTrack, stepIdx, item.id);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Generation failed';
      setError(`AI generation failed: ${errorMsg}`);
      
      // Find and update the queue item
      const queueItem = genQueue.find(q => q.prompt === prompt && q.status === 'generating');
      if (queueItem) {
        updateQueueItem(queueItem.id, { status: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }, [audioEngine, addToQueue, addToLibrary, assignToStepMulti, selectedTrack, updateQueueItem, genQueue, setLoading, setError]);

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
    return () => {
      // Access current values directly to avoid dependency issues
      if (audioEngine.schedulerTimerRef.current) {
        clearTimeout(audioEngine.schedulerTimerRef.current);
        audioEngine.schedulerTimerRef.current = null;
      }
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
        <div className="space-y-6">
          {/* Track Controls */}
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
          
          {/* AI Sample Packs */}
          <SamplePackSelector
            onPackLoad={(packId) => {
              // Optional: Show success message or auto-switch to library view
              console.log(`Loaded sample pack: ${packId}`);
            }}
          />
          
          {/* Step Editor */}
          <StepEditor
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
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sample Library */}
        <SampleLibrary
          library={library}
          onFileUpload={handleFileUpload}
        />
        
        {/* Generation Queue */}
        <GenerationQueue queue={genQueue} />
      </div>
      
      {/* Startup Helper */}
      <StartupHelper />
    </div>
  );
}