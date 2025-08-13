import React, { useState } from 'react';
import { Track } from '@/lib/types';
import { Tooltip } from './ui/Tooltip';
import { ConfirmDialog } from './ui/ConfirmDialog';

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
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [trackToClear, setTrackToClear] = useState<string | null>(null);

  const handleClearTrack = (trackId: string) => {
    setTrackToClear(trackId);
    setClearDialogOpen(true);
  };

  const confirmClearTrack = () => {
    if (trackToClear) {
      onClearTrack(trackToClear);
      setTrackToClear(null);
    }
  };
  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Vertical ORBITR Labels */}
      <div className="bg-zinc-800 rounded-full px-3 py-4 border border-zinc-700">
        <div className="flex flex-col items-center space-y-1">
          {tracks.map((track) => (
            <Tooltip
              key={track.id}
              content={
                <div className="text-center">
                  <div className="font-medium">Track {track.name}</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Volume: {Math.round(track.volume * 100)}%
                  </div>
                  <div className="text-xs text-zinc-400">
                    {track.muted ? 'Muted' : track.solo ? 'Solo' : 'Active'}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Click to select track
                  </div>
                </div>
              }
              side="right"
            >
              <button
                onClick={() => onSelectTrack(track.id)}
                className={`
                  w-8 h-8 rounded-full font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900
                  ${selectedTrack === track.id 
                    ? 'ring-2 ring-blue-400 shadow-lg scale-110 focus:ring-blue-400' 
                    : 'hover:scale-105 focus:ring-blue-400'
                  }
                  ${track.muted ? 'opacity-50' : ''}
                  ${track.solo ? 'ring-2 ring-yellow-400' : ''}
                `}
                style={{ 
                  backgroundColor: track.color,
                  color: track.color === '#f59e0b' ? '#000' : '#fff' // Dark text for yellow
                }}
                aria-label={`Select track ${track.name}${track.muted ? ', muted' : ''}${track.solo ? ', solo' : ''}`}
                aria-pressed={selectedTrack === track.id}
              >
                {track.name}
              </button>
            </Tooltip>
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
                  <Tooltip content="Adjust track volume (0-100%)" side="top">
                    <label htmlFor={`volume-${track.id}`} className="text-xs text-zinc-400 block mb-1">Volume</label>
                  </Tooltip>
                  <input
                    id={`volume-${track.id}`}
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={track.volume}
                    onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-label={`Track ${track.name} volume: ${Math.round(track.volume * 100)}%`}
                  />
                  <div className="text-xs text-zinc-500 text-center mt-1">
                    {Math.round(track.volume * 100)}%
                  </div>
                </div>

                {/* Mute/Solo buttons */}
                <div className="flex space-x-2">
                  <Tooltip content={track.muted ? "Unmute track" : "Mute track"} side="top">
                    <button
                      onClick={() => onMuteToggle(track.id)}
                      className={`
                        flex-1 px-2 py-1 text-xs rounded transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-zinc-800
                        ${track.muted 
                          ? 'bg-red-600 text-white focus:ring-red-400' 
                          : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 focus:ring-blue-400'
                        }
                      `}
                      aria-label={`${track.muted ? 'Unmute' : 'Mute'} track ${track.name}`}
                      aria-pressed={track.muted}
                    >
                      MUTE
                    </button>
                  </Tooltip>
                  <Tooltip content={track.solo ? "Disable solo" : "Solo track (mutes all others)"} side="top">
                    <button
                      onClick={() => onSoloToggle(track.id)}
                      className={`
                        flex-1 px-2 py-1 text-xs rounded transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-zinc-800
                        ${track.solo 
                          ? 'bg-yellow-600 text-black focus:ring-yellow-400' 
                          : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 focus:ring-blue-400'
                        }
                      `}
                      aria-label={`${track.solo ? 'Disable solo for' : 'Solo'} track ${track.name}`}
                      aria-pressed={track.solo}
                    >
                      SOLO
                    </button>
                  </Tooltip>
                </div>

                {/* Clear track */}
                <Tooltip content="Remove all samples from this track" side="top">
                  <button
                    onClick={() => handleClearTrack(track.id)}
                    className="w-full px-2 py-1 text-xs bg-zinc-700 text-zinc-300 rounded hover:bg-red-600 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 focus:ring-offset-zinc-800"
                    aria-label={`Clear all samples from track ${track.name}`}
                  >
                    Clear Track
                  </button>
                </Tooltip>
              </div>
            );
          })()}
        </div>
      )}

      {/* Clear Track Confirmation Dialog */}
      <ConfirmDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        title="Clear Track"
        description={`Are you sure you want to clear all samples from track ${trackToClear ? tracks.find(t => t.id === trackToClear)?.name : ''}? This action cannot be undone.`}
        confirmText="Clear Track"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmClearTrack}
      />

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