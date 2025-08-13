import React from 'react';
import { Track } from '@/lib/types';

interface TrackControlsProps {
  tracks: Track[];
  selectedTrack: string | null;
  onSelectTrack: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onClearTrack: (trackId: string) => void;
}

export const TrackControls: React.FC<TrackControlsProps> = ({
  tracks,
  selectedTrack,
  onSelectTrack,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onClearTrack,
}) => {
  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Vertical ORBITR Labels */}
      <div className="bg-zinc-800 rounded-full px-3 py-4 border border-zinc-700">
        <div className="flex flex-col items-center space-y-1">
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              className={`
                w-8 h-8 rounded-full font-bold text-sm transition-all
                ${selectedTrack === track.id 
                  ? 'ring-2 ring-blue-400 shadow-lg scale-110' 
                  : 'hover:scale-105'
                }
                ${track.muted ? 'opacity-50' : ''}
                ${track.solo ? 'ring-2 ring-yellow-400' : ''}
              `}
              style={{ 
                backgroundColor: track.color,
                color: track.color === '#f59e0b' ? '#000' : '#fff' // Dark text for yellow
              }}
            >
              {track.name}
            </button>
          ))}
        </div>
      </div>

      {/* Track-specific controls */}
      {selectedTrack && (
        <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 min-w-[120px]">
          {(() => {
            const track = tracks.find(t => t.id === selectedTrack);
            if (!track) return null;
            
            return (
              <div className="space-y-3">
                <div className="text-center">
                  <div 
                    className="w-6 h-6 rounded-full mx-auto mb-1"
                    style={{ backgroundColor: track.color }}
                  />
                  <div className="text-xs text-zinc-400">Track {track.name}</div>
                </div>

                {/* Volume */}
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Volume</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={track.volume}
                    onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-zinc-500 text-center mt-1">
                    {Math.round(track.volume * 100)}%
                  </div>
                </div>

                {/* Mute/Solo buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => onMuteToggle(track.id)}
                    className={`
                      flex-1 px-2 py-1 text-xs rounded transition-all
                      ${track.muted 
                        ? 'bg-red-600 text-white' 
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      }
                    `}
                  >
                    MUTE
                  </button>
                  <button
                    onClick={() => onSoloToggle(track.id)}
                    className={`
                      flex-1 px-2 py-1 text-xs rounded transition-all
                      ${track.solo 
                        ? 'bg-yellow-600 text-black' 
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      }
                    `}
                  >
                    SOLO
                  </button>
                </div>

                {/* Clear track */}
                <button
                  onClick={() => onClearTrack(track.id)}
                  className="w-full px-2 py-1 text-xs bg-zinc-700 text-zinc-300 rounded hover:bg-red-600 hover:text-white transition-all"
                >
                  Clear Track
                </button>
              </div>
            );
          })()}
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
};