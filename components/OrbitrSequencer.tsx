import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from 'axios';
import { useAudioStore } from '@/lib/audioStore';
import { StepEditor } from './StepEditor';
import { SampleLibrary } from './SampleLibrary';
import { GenerationQueue } from './GenerationQueue';
import { TransportControls } from './TransportControls';
import { TrackControls } from './TrackControls';
import { deg2rad, rid } from '@/lib/utils';

const STEPS_COUNT = 16;
const RADIUS = 160;
const CENTER = { x: 220, y: 220 };

export default function OrbitrSequencer() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const schedulerTimer = useRef<number | null>(null);
  const nextNoteTime = useRef(0);
  const currentStep = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [reverse, setReverse] = useState(false);
  const [masterGain, setMasterGain] = useState(0.9);
  const [swing, setSwing] = useState(0);

  const {
    track,
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
    clearTrack
  } = useAudioStore();

  // Audio initialization
  const ensureAudio = async () => {
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const mg = ctx.createGain();
      mg.gain.value = masterGain;
      mg.connect(ctx.destination);
      audioCtxRef.current = ctx;
      masterGainRef.current = mg;
      nextNoteTime.current = ctx.currentTime;
    }
  };

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = masterGain;
    }
  }, [masterGain]);

  // Scheduling with swing
  const secondsPerBeat = useMemo(() => 60.0 / bpm, [bpm]);
  const stepInterval = secondsPerBeat * 0.25; // 16th notes

  const getSwingOffset = (stepIndex: number) => {
    if (stepIndex % 2 === 0) return 0;
    return stepInterval * (swing * 0.3); // Max 30% swing
  };

  const scheduleStepPlayback = (stepIndex: number, time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Play all active tracks simultaneously
    tracks.forEach(currentTrack => {
      // Skip muted tracks (unless solo is active)
      const hasSolo = tracks.some(t => t.solo);
      if (hasSolo && !currentTrack.solo) return;
      if (!hasSolo && currentTrack.muted) return;

      const step = currentTrack.steps[stepIndex];
      if (!step?.active || !step?.buffer) return;
      if (Math.random() > step.prob) return;

      const src = ctx.createBufferSource();
      src.buffer = step.buffer;
      
      // Create track-specific gain chain
      const trackGain = ctx.createGain();
      const stepGain = ctx.createGain();
      
      trackGain.gain.value = currentTrack.volume;
      stepGain.gain.value = step.gain;
      
      // Connect: source -> step gain -> track gain -> master gain -> destination
      src.connect(stepGain)
         .connect(trackGain)
         .connect(masterGainRef.current!);
      
      src.start(time + getSwingOffset(stepIndex));
    });
  };

  const schedulerTick = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    
    const lookahead = 0.1;
    while (nextNoteTime.current < ctx.currentTime + lookahead) {
      scheduleStepPlayback(currentStep.current, nextNoteTime.current);
      const dir = reverse ? -1 : 1;
      currentStep.current = (currentStep.current + dir + STEPS_COUNT) % STEPS_COUNT;
      nextNoteTime.current += stepInterval;
    }
  };

  const start = async () => {
    await ensureAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
    nextNoteTime.current = ctx.currentTime + 0.05;
    schedulerTimer.current = window.setInterval(schedulerTick, 25);
    setIsPlaying(true);
  };

  const stop = () => {
    if (schedulerTimer.current) clearInterval(schedulerTimer.current);
    schedulerTimer.current = null;
    setIsPlaying(false);
  };

  useEffect(() => () => stop(), []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          isPlaying ? stop() : start();
          break;
        case 'g':
          if (selectedStep !== null && selectedTrack) {
            e.preventDefault();
            generateSample('drum hit', selectedStep, { quality: 'draft' });
          }
          break;
        case 'c':
          if (selectedStep !== null && selectedTrack) {
            e.preventDefault();
            clearStepMulti(selectedTrack, selectedStep);
          }
          break;
        case 'r':
          e.preventDefault();
          setReverse(prev => !prev);
          break;
        case 'arrowleft':
          e.preventDefault();
          setBpm(prev => Math.max(40, prev - 5));
          break;
        case 'arrowright':
          e.preventDefault();
          setBpm(prev => Math.min(200, prev + 5));
          break;
        // Number keys for step selection
        case '1': case '2': case '3': case '4': case '5':
        case '6': case '7': case '8': case '9': case '0':
          e.preventDefault();
          const stepNum = e.key === '0' ? 10 : parseInt(e.key);
          if (stepNum <= STEPS_COUNT) {
            setSelectedStep(stepNum - 1);
          }
          break;
        // Q-G for steps 11-16
        case 'q': setSelectedStep(10); break;
        case 'w': setSelectedStep(11); break;
        case 'e': setSelectedStep(12); break;
        case 'r': 
          if (!e.ctrlKey && !e.metaKey) {
            setSelectedStep(13); 
          }
          break;
        case 't': setSelectedStep(14); break;
        case 'y': setSelectedStep(15); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, selectedStep, selectedTrack]);

  // File handling
  const handleFiles = async (files: File[]) => {
    await ensureAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) {
        alert(`File ${f.name} is too large. Maximum size is 5MB.`);
        continue;
      }

      const ab = await f.arrayBuffer();
      try {
        const buf = await ctx.decodeAudioData(ab);
        addToLibrary({
          id: rid(),
          name: f.name.replace(/\.[^/.]+$/, ""),
          buffer: buf,
          duration: buf.duration,
          type: 'local'
        });
      } catch (error) {
        alert(`Error decoding file ${f.name}. Please make sure it is a valid audio file.`);
        console.error('Error decoding audio data:', error);
      }
    }
  };

  // AI Generation with caching
  const generateSample = useCallback(async (prompt: string, stepIndex?: number, options = {}) => {
    // Check cache first
    const cacheKey = `${prompt}_${JSON.stringify(options)}`;
    if (audioCache.has(cacheKey)) {
      const cached = audioCache.get(cacheKey)!;
      if (stepIndex !== undefined && selectedTrack) {
        assignToStepMulti(selectedTrack, stepIndex, cached.id);
      }
      return cached;
    }

    const id = rid();
    addToQueue({
      id,
      prompt,
      status: 'generating',
      progress: 0
    });

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/generate`, {
        prompt,
        duration: 1.5,
        ...options
      }, {
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          updateQueueItem(id, { progress });
        }
      });

      await ensureAudio();
      const ctx = audioCtxRef.current!;
      
      // Decode base64 audio
      const audioData = atob(response.data.audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }
      
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      
      const libItem = {
        id: rid(),
        name: response.data.name || `gen-${prompt.slice(0, 15)}`,
        buffer,
        duration: buffer.duration,
        type: 'ai' as const,
        prompt,
        seed: response.data.seed
      };
      
      addToLibrary(libItem);
      audioCache.set(cacheKey, libItem);
      
      if (stepIndex !== undefined && selectedTrack) {
        assignToStepMulti(selectedTrack, stepIndex, libItem.id);
      }
      
      updateQueueItem(id, { status: 'ready' });
      return libItem;
    } catch (error) {
      console.error('Generation failed:', error);
      updateQueueItem(id, { status: 'error' });
      throw error;
    }
  }, [audioCache, addToQueue, updateQueueItem, addToLibrary, assignToStepMulti, selectedTrack]);

  // Comprehensive sample pack generation
  const generateSamplePack = async (packName: string) => {
    const packs = {
      'lofi': {
        name: 'Lo-Fi Hip Hop Pack',
        samples: [
          { prompt: 'lo-fi kick drum, soft, vinyl crackle', track: 'track1', step: 0, duration: 0.8 },
          { prompt: 'lo-fi snare drum, dusty, vintage', track: 'track1', step: 4, duration: 0.6 },
          { prompt: 'lo-fi hi-hat, closed, vinyl texture', track: 'track2', step: 2, duration: 0.2 },
          { prompt: 'lo-fi hi-hat, open, warm', track: 'track2', step: 6, duration: 0.4 },
          { prompt: 'lo-fi bass drum, deep, muffled', track: 'track3', step: 1, duration: 0.7 },
          { prompt: 'lo-fi rim shot, crisp, analog', track: 'track4', step: 8, duration: 0.3 },
        ]
      },
      'techno': {
        name: 'Techno Essentials Pack',
        samples: [
          { prompt: 'techno kick drum, punchy, 909 style', track: 'track1', step: 0, duration: 0.6 },
          { prompt: 'techno hi-hat, metallic, sharp', track: 'track2', step: 4, duration: 0.15 },
          { prompt: 'techno clap, reverb, industrial', track: 'track2', step: 8, duration: 0.4 },
          { prompt: 'techno bass hit, sub, distorted', track: 'track3', step: 2, duration: 0.8 },
          { prompt: 'techno percussion, metallic, rhythmic', track: 'track4', step: 6, duration: 0.3 },
          { prompt: 'techno cymbal, crash, filtered', track: 'track4', step: 12, duration: 0.5 },
        ]
      },
      'trap': {
        name: 'Trap Bangers Pack',
        samples: [
          { prompt: 'trap kick drum, 808, deep sub bass', track: 'track1', step: 0, duration: 1.2 },
          { prompt: 'trap snare drum, crisp, layered', track: 'track1', step: 4, duration: 0.4 },
          { prompt: 'trap hi-hat, fast, metallic rolls', track: 'track2', step: 2, duration: 0.1 },
          { prompt: 'trap open hat, sizzling, long decay', track: 'track2', step: 6, duration: 0.6 },
          { prompt: 'trap percussion, latin, rhythmic', track: 'track3', step: 8, duration: 0.3 },
          { prompt: 'trap clap, reverb, wide stereo', track: 'track4', step: 12, duration: 0.5 },
        ]
      },
      'house': {
        name: 'House Grooves Pack',
        samples: [
          { prompt: 'house kick drum, four-on-floor, punchy', track: 'track1', step: 0, duration: 0.5 },
          { prompt: 'house hi-hat, closed, tight groove', track: 'track2', step: 2, duration: 0.15 },
          { prompt: 'house clap, dry, percussive', track: 'track2', step: 8, duration: 0.3 },
          { prompt: 'house bass drum, deep, warm', track: 'track3', step: 4, duration: 0.7 },
          { prompt: 'house percussion, bongo, organic', track: 'track4', step: 6, duration: 0.4 },
          { prompt: 'house shaker, steady, rhythmic', track: 'track4', step: 10, duration: 0.2 },
        ]
      },
      'ambient': {
        name: 'Ambient Textures Pack',
        samples: [
          { prompt: 'ambient pad, warm, evolving texture', track: 'track1', step: 0, duration: 2.0 },
          { prompt: 'ambient bell, crystal, reverb tail', track: 'track2', step: 4, duration: 1.5 },
          { prompt: 'ambient drone, deep, atmospheric', track: 'track3', step: 8, duration: 2.5 },
          { prompt: 'ambient percussion, soft, organic', track: 'track4', step: 2, duration: 0.8 },
          { prompt: 'ambient grain, texture, evolving', track: 'track4', step: 12, duration: 1.0 },
        ]
      }
    };

    const pack = packs[packName as keyof typeof packs];
    if (!pack) return;

    console.log(`Generating ${pack.name}...`);
    
    for (let i = 0; i < pack.samples.length; i++) {
      const sample = pack.samples[i];
      try {
        await generateSample(sample.prompt, sample.step, {
          quality: 'draft',
          duration: sample.duration
        });
        
        // Set the track for this generation
        setSelectedTrack(sample.track);
        
        console.log(`Generated: ${sample.prompt}`);
        
        // Stagger requests to avoid overwhelming backend
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`Failed to generate sample: ${sample.prompt}`, error);
      }
    }
    
    console.log(`${pack.name} generation complete!`);
  };

  // Legacy kit generation (simplified)
  const generateKit = async (theme: string) => {
    await generateSamplePack('lofi');
  };

  // Playhead animation
  const [, setTick] = useState(0);
  useEffect(() => {
    let raf: number;
    const loop = () => {
      if (isPlaying) setTick(n => (n + 1) % 1000000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  const angleForStep = (i: number) => (360 / STEPS_COUNT) * i - 90;
  const playheadAngle = () => angleForStep(currentStep.current);

  return (
    <div>
      <div>Test</div>
          <div className="bg-zinc-900 text-zinc-100 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
                  Orbitr AI
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Circular sequencer with AI sample generation
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Press 1-9,0,Q-Y to select steps | G to generate | C to clear | Space to play/stop
                </p>
              </div>
              <div className="flex gap-2">
                <select 
                  onChange={(e) => generateSamplePack(e.target.value)}
                  className="px-3 py-2 bg-zinc-800 text-zinc-100 rounded-lg border border-zinc-600 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>Choose Sample Pack</option>
                  <option value="lofi">🎵 Lo-Fi Hip Hop</option>
                  <option value="techno">🤖 Techno Essentials</option>
                  <option value="trap">🔥 Trap Bangers</option>
                  <option value="house">🏠 House Grooves</option>
                  <option value="ambient">🌙 Ambient Textures</option>
                </select>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear all tracks?")) {
                      tracks.forEach(track => clearTrack(track.id));
                    }
                  }}
                  className="px-3 py-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-all text-sm"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="relative">
              <svg width={440} height={440} className="mx-auto block">
                {/* SVG Filters for glows */}
                <defs>
                  <filter id="activeGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge> 
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <filter id="trackGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge> 
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                {/* Render all tracks as concentric rings */}
                {tracks.map((currentTrack, trackIdx) => (
                  <g key={currentTrack.id}>
                    {/* Track ring */}
                    <circle
                      cx={CENTER.x}
                      cy={CENTER.y}
                      r={currentTrack.radius}
                      fill="none"
                      stroke={selectedTrack === currentTrack.id ? currentTrack.color : "#27272a"}
                      strokeWidth={selectedTrack === currentTrack.id ? 3 : 2}
                      opacity={selectedTrack === currentTrack.id ? 0.8 : 0.3}
                      filter={selectedTrack === currentTrack.id ? "url(#trackGlow)" : undefined}
                    />

                    {/* Steps on this track */}
                    {currentTrack.steps.map((s, i) => {
                      const ang = angleForStep(i);
                      const r = deg2rad(ang);
                      const x = CENTER.x + Math.cos(r) * currentTrack.radius;
                      const y = CENTER.y + Math.sin(r) * currentTrack.radius;
                      const isGenerating = genQueue.some(
                        q => q.status === 'generating' && s.prompt === q.prompt
                      );
                      const isSelected = selectedStep === i && selectedTrack === currentTrack.id;
                      const isTrackSelected = selectedTrack === currentTrack.id;
                      
                      return (
                        <g key={s.id} transform={`translate(${x}, ${y})`}>
                          {/* Selection glow */}
                          {isSelected && (
                            <>
                              <circle
                                r={18}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                opacity={0.4}
                                className="animate-pulse"
                              />
                              <circle
                                r={15}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                opacity={0.8}
                                className="animate-pulse"
                              />
                            </>
                          )}
                          <circle
                            r={isTrackSelected ? 12 : 8}
                            fill={s.active ? currentTrack.color : "#52525b"}
                            stroke={isGenerating ? "#a855f7" : isSelected ? "#3b82f6" : "#0a0a0a"}
                            strokeWidth={isGenerating ? 2 : isSelected ? 2 : 1}
                            className={isGenerating ? "generating" : s.active ? "active-step" : ""}
                            opacity={isTrackSelected ? 1 : 0.6}
                            filter={s.active ? "url(#activeGlow)" : undefined}
                            onClick={(e) => {
                              // Select this track
                              setSelectedTrack(currentTrack.id);
                              
                              if (e.shiftKey && selectedStep !== null && selectedTrack === currentTrack.id) {
                                // Shift+Click: select range on same track
                                const start = Math.min(selectedStep, i);
                                const end = Math.max(selectedStep, i);
                                for (let idx = start; idx <= end; idx++) {
                                  toggleStepMulti(currentTrack.id, idx);
                                }
                              } else {
                                // Regular click: toggle step and select it
                                toggleStepMulti(currentTrack.id, i);
                                setSelectedStep(i);
                              }
                            }}
                            style={{ cursor: "pointer", transition: "all 0.2s" }}
                          />
                          {/* Step number (only show on selected track) */}
                          {isTrackSelected && (
                            <text
                              x={0}
                              y={3}
                              textAnchor="middle"
                              fontSize={8}
                              fill="#fafafa"
                              fontWeight="bold"
                              className="select-none pointer-events-none"
                            >
                              {i + 1}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                ))}

                {/* Center track selector */}
                <g transform={`translate(${CENTER.x}, ${CENTER.y})`}>
                  <circle
                    r={50}
                    fill="#18181b"
                    stroke="#27272a"
                    strokeWidth={2}
                    filter="url(#activeGlow)"
                  />
                  <text
                    x={0}
                    y={-20}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#a1a1aa"
                    className="select-none"
                  >
                    ORBITR
                  </text>
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    fontSize={16}
                    fill={tracks.find(t => t.id === selectedTrack)?.color || "#a1a1aa"}
                    fontWeight="bold"
                    className="select-none"
                    filter="url(#activeGlow)"
                  >
                    {tracks.find(t => t.id === selectedTrack)?.name || ""}
                  </text>
                  <text
                    x={0}
                    y={15}
                    textAnchor="middle"
                    fontSize={8}
                    fill="#a1a1aa"
                    className="select-none"
                  >
                    Track {tracks.findIndex(t => t.id === selectedTrack) + 1}
                  </text>
                </g>

              {/* Playhead */}
              {isPlaying && (
                <g>
                  {(() => {
                    const ang = playheadAngle();
                    const r = deg2rad(ang);
                    const x1 = CENTER.x + Math.cos(r) * (RADIUS - 30);
                    const y1 = CENTER.y + Math.sin(r) * (RADIUS - 30);
                    const x2 = CENTER.x + Math.cos(r) * (RADIUS + 10);
                    const y2 = CENTER.y + Math.sin(r) * (RADIUS + 10);
                    return (
                      <>
                        <line 
                          x1={x1} 
                          y1={y1} 
                          x2={x2} 
                          y2={y2} 
                          stroke="#e5e7eb" 
                          strokeWidth={3}
                          strokeLinecap="round"
                        />
                        <circle
                          cx={CENTER.x + Math.cos(r) * RADIUS}
                          cy={CENTER.y + Math.sin(r) * RADIUS}
                          r={25}
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth={2}
                          opacity={0.5}
                        />
                      </>
                    );
                  })()}
                </g>
              )}
            </svg>

            <TransportControls
              isPlaying={isPlaying}
              onPlayStop={isPlaying ? stop : start}
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
        </div>

        {/* Right: Controls */}
        <div className="space-y-6">
          <TrackControls
            tracks={tracks}
            selectedTrack={selectedTrack}
            onSelectTrack={setSelectedTrack}
            onVolumeChange={setTrackVolume}
            onMuteToggle={setTrackMute}
            onSoloToggle={setTrackSolo}
            onClearTrack={clearTrack}
          />
          
          <StepEditor
            steps={track}
            onStepChange={updateStep}
            onAssign={assignToStep}
            onGenerate={generateSample}
            library={library}
          />
          
          <SampleLibrary
            library={library}
            onFileUpload={handleFiles}
            onAssignToStep={assignToStep}
          />
          
          <GenerationQueue queue={genQueue} />
        </div>
        </div>
    </div>
  );
}
