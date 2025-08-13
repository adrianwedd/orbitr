import React from 'react';

interface TransportControlsProps {
  isPlaying: boolean;
  onPlayStop: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  reverse: boolean;
  onReverseChange: (reverse: boolean) => void;
  swing: number;
  onSwingChange: (swing: number) => void;
  masterGain: number;
  onMasterGainChange: (gain: number) => void;
}

export function TransportControls({
  isPlaying,
  onPlayStop,
  bpm,
  onBpmChange,
  reverse,
  onReverseChange,
  swing,
  onSwingChange,
  masterGain,
  onMasterGainChange
}: TransportControlsProps) {
  return (
    <div className="mt-6 space-y-4">
      {/* Main transport */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onPlayStop}
          className={`px-8 py-3 rounded-xl font-bold text-lg transition-all ${
            isPlaying
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-emerald-500 hover:bg-emerald-600 text-black"
          }`}
        >
          {isPlaying ? "■ Stop" : "▶ Play"}
        </button>
        
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={reverse}
            onChange={(e) => onReverseChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-zinc-400">Reverse</span>
        </label>
      </div>

      {/* Controls grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-400 w-16">BPM</label>
          <input
            type="range"
            min={40}
            max={200}
            value={bpm}
            onChange={(e) => onBpmChange(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-right tabular-nums text-zinc-300">{bpm}</span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-400 w-16">Swing</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={swing}
            onChange={(e) => onSwingChange(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-right tabular-nums text-zinc-300">
            {(swing * 100).toFixed(0)}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-400 w-16">Master</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterGain}
            onChange={(e) => onMasterGainChange(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-right tabular-nums text-zinc-300">
            {masterGain.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
