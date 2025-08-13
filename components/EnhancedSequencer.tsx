// Enhanced Sequencer Component with Audio-Reactive Visuals and Spring Animations
// Features: 3D depth, canvas visualizations, progressive disclosure, spring physics

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAudioStore } from '@/lib/audioStore';
import { audioAnalysis, AudioAnalysisData } from '@/lib/audioAnalysis';
import { createVisualizationCanvas, CanvasVisualizationEngine } from '@/lib/canvasVisualizations';
import { springAnimations, springPresets } from '@/lib/springAnimations';
import { calculateAudioReactiveColor, generateCSSCustomProperties } from '@/lib/designSystem';
import { deg2rad } from '@/lib/utils';

interface EnhancedSequencerProps {
  isPlaying: boolean;
  currentStep: number;
  onStepClick: (trackId: string, stepIndex: number) => void;
  onPlayheadClick: () => void;
  audioContext?: AudioContext;
}

const STEPS_COUNT = 16;
const CENTER = { x: 220, y: 220 };

export function EnhancedSequencer({
  isPlaying,
  currentStep,
  onStepClick,
  onPlayheadClick,
  audioContext
}: EnhancedSequencerProps) {
  const sequencerRef = useRef<HTMLDivElement>(null);
  const canvasEngineRef = useRef<CanvasVisualizationEngine | null>(null);
  const [audioData, setAudioData] = useState<AudioAnalysisData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { tracks, selectedTrack, selectedStep, setSelectedTrack, setSelectedStep, toggleStepMulti } = useAudioStore();

  // Initialize audio analysis and canvas visualization
  useEffect(() => {
    if (!audioContext || !sequencerRef.current) return;

    const initializeEnhancements = async () => {
      try {
        // Initialize audio analysis
        await audioAnalysis.initialize(audioContext);
        
        // Create canvas visualization overlay
        const { engine } = createVisualizationCanvas(sequencerRef.current!);
        canvasEngineRef.current = engine;
        
        // Start audio analysis and canvas
        audioAnalysis.start();
        engine.start();
        
        // Subscribe to audio analysis updates
        const unsubscribe = audioAnalysis.onAnalysis((data) => {
          setAudioData(data);
          engine.updateAudioData(data);
        });
        
        setIsInitialized(true);
        
        return () => {
          unsubscribe();
          audioAnalysis.stop();
          engine.cleanup();
        };
      } catch (error) {
        console.error('Failed to initialize enhanced sequencer:', error);
      }
    };

    initializeEnhancements();
  }, [audioContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (canvasEngineRef.current) {
        canvasEngineRef.current.cleanup();
      }
      audioAnalysis.stop();
    };
  }, []);

  // Update CSS custom properties with audio-reactive colors
  useEffect(() => {
    if (!audioData || !sequencerRef.current) return;
    
    const customProperties = generateCSSCustomProperties(audioData);
    
    Object.entries(customProperties).forEach(([property, value]) => {
      sequencerRef.current!.style.setProperty(property, value);
    });
  }, [audioData]);

  // Animate step triggers with spring physics
  const animateStepTrigger = useCallback((stepIndex: number, trackId: string) => {
    if (!audioData) return;
    
    // Create burst effect on canvas
    if (canvasEngineRef.current) {
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        const angle = (stepIndex / STEPS_COUNT) * Math.PI * 2 - Math.PI / 2;
        const x = CENTER.x + track.radius * Math.cos(angle);
        const y = CENTER.y + track.radius * Math.sin(angle);
        
        canvasEngineRef.current.addBurst(x, y, audioData.energy);
      }
    }
    
    // Animate step with spring physics
    const stepKey = `step-${trackId}-${stepIndex}`;
    springAnimations.animate(
      stepKey,
      1.2, // Scale to 120%
      springPresets.bouncy,
      (scale) => {
        const stepElement = document.querySelector(`[data-step="${trackId}-${stepIndex}"]`) as HTMLElement;
        if (stepElement) {
          stepElement.style.transform = `scale(${scale})`;
        }
      },
      1 // Start from normal scale
    );
    
    // Return to normal scale
    setTimeout(() => {
      springAnimations.setTarget(stepKey, 1);
    }, 100);
  }, [audioData, tracks]);

  // Handle step interactions
  const handleStepClick = useCallback((trackId: string, stepIndex: number) => {
    setSelectedTrack(trackId);
    setSelectedStep(stepIndex);
    toggleStepMulti(trackId, stepIndex);
    
    // Animate interaction
    animateStepTrigger(stepIndex, trackId);
    onStepClick(trackId, stepIndex);
  }, [setSelectedTrack, setSelectedStep, toggleStepMulti, animateStepTrigger, onStepClick]);

  // Render enhanced step with audio-reactive styling
  const renderEnhancedStep = (track: any, stepIndex: number) => {
    const step = track.steps[stepIndex];
    const angle = stepIndex * (360 / STEPS_COUNT) - 90;
    const x = CENTER.x + track.radius * Math.cos(deg2rad(angle));
    const y = CENTER.y + track.radius * Math.sin(deg2rad(angle));
    const isCurrentStep = currentStep === stepIndex && isPlaying;
    const isSelected = selectedTrack === track.id && selectedStep === stepIndex;
    
    // Calculate audio-reactive properties
    const baseRadius = step.active ? 8 : 4;
    const audioInfluence = audioData ? (audioData.energy * 0.3) : 0;
    const dynamicRadius = baseRadius + audioInfluence * 4;
    
    // Audio-reactive color
    const color = audioData 
      ? calculateAudioReactiveColor(`track${track.name}`, audioData)
      : track.color;
    
    // Enhanced visual states
    const strokeWidth = isCurrentStep ? 4 : (isSelected ? 3 : 1);
    const opacity = step.active ? (0.8 + audioInfluence * 0.2) : 0.4;
    const glowIntensity = isCurrentStep ? (0.5 + audioInfluence) : 0;
    
    return (
      <g key={`${track.id}-${stepIndex}`}>
        {/* Glow effect for active steps */}
        {step.active && (
          <circle
            cx={x}
            cy={y}
            r={dynamicRadius + 6}
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity={glowIntensity * 0.3}
            className="pointer-events-none"
            style={{
              filter: `blur(${glowIntensity * 4}px)`,
            }}
          />
        )}
        
        {/* Main step circle */}
        <circle
          cx={x}
          cy={y}
          r={dynamicRadius}
          fill={step.active ? color : 'transparent'}
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
          className="cursor-pointer transition-all duration-200 hover:opacity-90"
          data-step={`${track.id}-${stepIndex}`}
          onClick={() => handleStepClick(track.id, stepIndex)}
          style={{
            filter: isCurrentStep ? `drop-shadow(0 0 8px ${color})` : 'none',
            transform: isSelected ? 'scale(1.1)' : 'scale(1)',
            transformOrigin: `${x}px ${y}px`
          }}
        />
        
        {/* Sample indicator */}
        {step.buffer && (
          <circle
            cx={x}
            cy={y}
            r={2}
            fill="white"
            opacity={0.8}
            className="pointer-events-none"
          />
        )}
        
        {/* Current step highlight */}
        {isCurrentStep && (
          <circle
            cx={x}
            cy={y}
            r={dynamicRadius + 3}
            fill="none"
            stroke="white"
            strokeWidth="2"
            opacity={0.6}
            className="pointer-events-none animate-ping"
          />
        )}
      </g>
    );
  };

  // Render enhanced track ring with waveform visualization
  const renderEnhancedTrack = (track: any, trackIndex: number) => {
    const color = audioData 
      ? calculateAudioReactiveColor(`track${track.name}`, audioData)
      : track.color;
    
    const intensity = audioData 
      ? [audioData.bass, audioData.mid, audioData.mid, audioData.treble][trackIndex] || 0
      : 0;
    
    const strokeWidth = 2 + intensity * 4;
    const opacity = 0.3 + intensity * 0.4;
    
    return (
      <g key={`track-${track.id}`}>
        {/* Base track ring */}
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={track.radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
          className="transition-all duration-300"
          style={{
            filter: intensity > 0.5 ? `drop-shadow(0 0 6px ${color})` : 'none'
          }}
        />
        
        {/* Track label with enhanced styling */}
        <text
          x={CENTER.x + (track.radius - 25) * Math.cos(deg2rad(-90))}
          y={CENTER.y + (track.radius - 25) * Math.sin(deg2rad(-90)) + 5}
          textAnchor="middle"
          className="text-sm font-bold fill-current select-none"
          style={{ 
            fill: color,
            filter: intensity > 0.3 ? `drop-shadow(0 0 4px ${color})` : 'none'
          }}
        >
          {track.name}
        </text>
        
        {/* Steps for this track */}
        {track.steps.map((step: any, stepIndex: number) => renderEnhancedStep(track, stepIndex))}
      </g>
    );
  };

  // Enhanced play button with audio-reactive styling
  const renderEnhancedPlayButton = () => {
    const energy = audioData?.energy || 0;
    const scale = 1 + energy * 0.1;
    const glowIntensity = isPlaying ? (0.5 + energy * 0.5) : 0;
    
    const playButtonColor = isPlaying ? '#dc2626' : '#10b981';
    const shadowColor = isPlaying ? 'rgba(220, 38, 38, 0.5)' : 'rgba(16, 185, 129, 0.5)';
    
    return (
      <g
        className="cursor-pointer transition-all duration-200"
        onClick={onPlayheadClick}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: `${CENTER.x}px ${CENTER.y}px`
        }}
      >
        {/* Glow effect */}
        {isPlaying && (
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r={35 + energy * 10}
            fill="none"
            stroke={playButtonColor}
            strokeWidth="2"
            opacity={glowIntensity * 0.3}
            className="pointer-events-none animate-pulse"
            style={{
              filter: `blur(${glowIntensity * 8}px)`
            }}
          />
        )}
        
        {/* Main button */}
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r="30"
          fill={playButtonColor}
          className="transition-all duration-200 hover:opacity-90"
          style={{
            filter: `drop-shadow(0 0 ${glowIntensity * 12}px ${shadowColor})`
          }}
        />
        
        {/* Play/Stop icon */}
        <text
          x={CENTER.x}
          y={CENTER.y + 5}
          textAnchor="middle"
          className="text-lg font-bold fill-white pointer-events-none select-none"
        >
          {isPlaying ? '■' : '▶'}
        </text>
      </g>
    );
  };

  return (
    <div 
      ref={sequencerRef}
      className="relative bg-zinc-900 rounded-2xl p-8 overflow-hidden"
      style={{
        background: audioData 
          ? `radial-gradient(circle at center, ${generateCSSCustomProperties(audioData)['--color-background-reactive']}, hsl(240, 10%, 4%))`
          : undefined
      }}
    >
      {/* Loading state */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-zinc-400">Initializing audio visualization...</p>
          </div>
        </div>
      )}
      
      {/* Enhanced sequencer visualization */}
      <div className="relative w-full max-w-md mx-auto aspect-square">
        {/* SVG Sequencer with enhanced visuals */}
        <svg 
          viewBox="0 0 440 440" 
          className="w-full h-full relative z-10"
          style={{
            filter: audioData?.energy ? `contrast(${1 + audioData.energy * 0.2})` : 'none'
          }}
        >
          {/* Background gradient overlay */}
          <defs>
            <radialGradient id="sequencer-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.1)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
            </radialGradient>
          </defs>
          
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r="200"
            fill="url(#sequencer-gradient)"
            opacity={audioData?.energy || 0}
            className="pointer-events-none"
          />
          
          {/* Enhanced tracks */}
          {tracks.map((track, trackIndex) => renderEnhancedTrack(track, trackIndex))}
          
          {/* Enhanced play button */}
          {renderEnhancedPlayButton()}
        </svg>
        
        {/* Canvas overlay for particle effects (created by createVisualizationCanvas) */}
        {/* This will be automatically inserted as a child by the canvas system */}
      </div>
      
      {/* Audio visualization indicators */}
      {audioData && (
        <div className="absolute top-4 right-4 space-y-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full opacity-50" style={{ opacity: audioData.bass }} />
            <span>Bass</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full opacity-50" style={{ opacity: audioData.mid }} />
            <span>Mid</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full opacity-50" style={{ opacity: audioData.treble }} />
            <span>Treble</span>
          </div>
        </div>
      )}
      
      {/* Energy meter */}
      {audioData && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <span className="text-xs text-zinc-400">Energy</span>
          <div className="w-16 h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-yellow-500 transition-all duration-100"
              style={{ width: `${audioData.energy * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedSequencer;