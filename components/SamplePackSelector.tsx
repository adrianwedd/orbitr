import React, { useState } from 'react';
import { SAMPLE_PACKS, SamplePack, createSampleFromPack } from '@/lib/samplePacks';
import { useAudioStore } from '@/lib/audioStore';
import { Tooltip } from './ui/Tooltip';
import { getApiUrl, config } from '@/lib/config';
import { generateStaticSample } from '@/lib/staticSamples';
import axios from 'axios';

interface SamplePackSelectorProps {
  onPackLoad?: (packId: string) => void;
}

export function SamplePackSelector({ onPackLoad }: SamplePackSelectorProps) {
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  
  const { 
    addToLibrary, 
    assignToStepMulti, 
    setLoading, 
    setError,
    tracks
  } = useAudioStore();

  const handleLoadPack = async (pack: SamplePack) => {
    setLoadingPack(pack.id);
    setLoading(true, `Loading ${pack.name} sample pack...`);
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const apiUrl = getApiUrl();
      
      // Generate all samples in the pack
      for (let i = 0; i < pack.samples.length; i++) {
        const sample = pack.samples[i];
        
        try {
          setLoading(true, `Generating ${sample.name}... (${i + 1}/${pack.samples.length})`);
          
          let libraryItem;
          
          if (config.isStaticMode) {
            // Use static sample generation for GitHub Pages
            libraryItem = await generateStaticSample(sample.prompt);
            // Override with pack-specific naming
            libraryItem.name = sample.name;
          } else {
            // Use backend API for full deployment
            const response = await axios.post(`${apiUrl}/generate`, {
              prompt: sample.prompt,
              quality: 'draft', // Use draft quality for quick pack generation
              duration: 8,
              cfg_coef: 7.5
            });

            const audioData = response.data.audio;
            const audioBuffer = await audioContext.decodeAudioData(
              Uint8Array.from(atob(audioData), c => c.charCodeAt(0)).buffer
            );

            libraryItem = createSampleFromPack(pack, i, audioBuffer);
          }
          addToLibrary(libraryItem);

          // Auto-assign to suggested track and first available step
          if (sample.suggestedTrack) {
            const track = tracks.find(t => t.id === sample.suggestedTrack);
            if (track) {
              const emptyStepIndex = track.steps.findIndex(step => !step.buffer);
              if (emptyStepIndex !== -1) {
                assignToStepMulti(sample.suggestedTrack, emptyStepIndex, libraryItem.id);
              }
            }
          }
        } catch (error) {
          console.error(`Failed to generate ${sample.name}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setError(`Failed to generate ${sample.name}: ${errorMessage}. Please check your backend connection.`);
        }
      }

      onPackLoad?.(pack.id);
      setExpandedPack(null);
      
    } catch (error) {
      setError(`Failed to load ${pack.name} pack: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingPack(null);
      setLoading(false);
    }
  };

  const handleGenerateSingle = async (pack: SamplePack, sampleIndex: number) => {
    const sample = pack.samples[sampleIndex];
    setLoading(true, `Generating ${sample.name}...`);
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      let libraryItem;
      
      if (config.isStaticMode) {
        // Use static sample generation for GitHub Pages
        libraryItem = await generateStaticSample(sample.prompt);
        // Override with pack-specific naming
        libraryItem.name = sample.name;
      } else {
        // Use backend API for full deployment
        const apiUrl = getApiUrl();
        
        const response = await axios.post(`${apiUrl}/generate`, {
          prompt: sample.prompt,
          quality: 'draft',
          duration: 8,
          cfg_coef: 7.5
        });

        const audioData = response.data.audio;
        const audioBuffer = await audioContext.decodeAudioData(
          Uint8Array.from(atob(audioData), c => c.charCodeAt(0)).buffer
        );

        libraryItem = createSampleFromPack(pack, sampleIndex, audioBuffer);
      }
      addToLibrary(libraryItem);

      // Auto-assign to suggested track
      if (sample.suggestedTrack) {
        const track = tracks.find(t => t.id === sample.suggestedTrack);
        if (track) {
          const emptyStepIndex = track.steps.findIndex(step => !step.buffer);
          if (emptyStepIndex !== -1) {
            assignToStepMulti(sample.suggestedTrack, emptyStepIndex, libraryItem.id);
          }
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to generate ${sample.name}: ${errorMessage}. Please check your backend connection.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 text-zinc-100 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">AI Sample Packs</h2>
        <span className="text-sm text-zinc-400">{SAMPLE_PACKS.length} curated packs</span>
      </div>

      <div className="space-y-3">
        {SAMPLE_PACKS.map((pack) => (
          <div key={pack.id} className="border border-zinc-700 rounded-lg overflow-hidden">
            {/* Pack Header */}
            <div 
              className="p-3 bg-zinc-800 cursor-pointer hover:bg-zinc-750 transition-colors"
              onClick={() => setExpandedPack(expandedPack === pack.id ? null : pack.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sm">{pack.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{pack.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip content={`Load all ${pack.samples.length} samples and auto-assign to tracks`} side="top">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadPack(pack);
                      }}
                      disabled={loadingPack === pack.id}
                      className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      {loadingPack === pack.id ? 'Loading...' : 'Load Pack'}
                    </button>
                  </Tooltip>
                  <span className="text-xs text-zinc-500">
                    {expandedPack === pack.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pack Contents */}
            {expandedPack === pack.id && (
              <div className="p-3 bg-zinc-850 border-t border-zinc-700">
                <div className="space-y-2">
                  {pack.samples.map((sample, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-zinc-800 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{sample.name}</span>
                          {sample.suggestedTrack && (
                            <span 
                              className="px-1.5 py-0.5 text-xs rounded"
                              style={{ 
                                backgroundColor: tracks.find(t => t.id === sample.suggestedTrack)?.color + '20',
                                color: tracks.find(t => t.id === sample.suggestedTrack)?.color
                              }}
                            >
                              Track {tracks.find(t => t.id === sample.suggestedTrack)?.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 truncate italic">"{sample.prompt}"</p>
                      </div>
                      <Tooltip content="Generate this sample" side="top">
                        <button
                          onClick={() => handleGenerateSingle(pack, index)}
                          className="ml-2 px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        >
                          Generate
                        </button>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500">
          Sample packs provide curated AI prompts designed for multi-track arrangement. 
          Individual samples auto-assign to suggested tracks for quick setup.
        </p>
      </div>
    </div>
  );
}