import React from 'react';
import { Tooltip, KeyboardShortcutTooltip } from './ui/Tooltip';
import { KEYBOARD_SHORTCUTS, getKeyboardShortcutDescription } from '@/lib/useKeyboardShortcuts';

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
        <KeyboardShortcutTooltip
          shortcut={KEYBOARD_SHORTCUTS.PLAY_STOP}
          description={getKeyboardShortcutDescription('play_stop')}
          side="top"
        >
          <button
            onClick={onPlayStop}
            className={`px-8 py-3 rounded-xl font-bold text-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
              isPlaying
                ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-400"
                : "bg-emerald-500 hover:bg-emerald-600 text-black focus:ring-emerald-400"
            }`}
            aria-label={`${isPlaying ? 'Stop' : 'Play'} sequencer`}
            aria-pressed={isPlaying}
          >
            {isPlaying ? "■ Stop" : "▶ Play"}
          </button>
        </KeyboardShortcutTooltip>
        
        <KeyboardShortcutTooltip
          shortcut={KEYBOARD_SHORTCUTS.REVERSE}
          description={getKeyboardShortcutDescription('reverse')}
          side="top"
        >
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={reverse}
              onChange={(e) => onReverseChange(e.target.checked)}
              className="w-4 h-4 cursor-pointer focus:ring-2 focus:ring-blue-400"
              aria-label="Toggle reverse playback"
            />
            <span className="text-zinc-400 select-none">Reverse</span>
          </label>
        </KeyboardShortcutTooltip>
      </div>

      {/* Controls grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <Tooltip 
            content={
              <div className="text-center">
                <div className="font-medium">Tempo Control</div>
                <div className="text-xs text-zinc-400 mt-1">
                  Use {KEYBOARD_SHORTCUTS.BPM_DECREASE}/{KEYBOARD_SHORTCUTS.BPM_INCREASE} keys to adjust
                </div>
                <div className="text-xs text-zinc-400">
                  Range: 40-200 BPM
                </div>
              </div>
            }
            side="top"
          >
            <label className="text-sm text-zinc-400 w-16 cursor-help">BPM</label>
          </Tooltip>
          <input
            type="range"
            min={40}
            max={200}
            value={bpm}
            onChange={(e) => onBpmChange(parseInt(e.target.value))}
            className="flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label={`Tempo: ${bpm} BPM`}
          />
          <span className="w-12 text-right tabular-nums text-zinc-300">{bpm}</span>
        </div>

        <div className="flex items-center gap-3">
          <Tooltip 
            content="Add timing variation to off-beat steps (0-100%)"
            side="top"
          >
            <label className="text-sm text-zinc-400 w-16 cursor-help">Swing</label>
          </Tooltip>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={swing}
            onChange={(e) => onSwingChange(parseFloat(e.target.value))}
            className="flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label={`Swing: ${(swing * 100).toFixed(0)}%`}
          />
          <span className="w-12 text-right tabular-nums text-zinc-300">
            {(swing * 100).toFixed(0)}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Tooltip 
            content="Master output volume (affects all tracks)"
            side="top"
          >
            <label className="text-sm text-zinc-400 w-16 cursor-help">Master</label>
          </Tooltip>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterGain}
            onChange={(e) => onMasterGainChange(parseFloat(e.target.value))}
            className="flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label={`Master volume: ${(masterGain * 100).toFixed(0)}%`}
          />
          <span className="w-12 text-right tabular-nums text-zinc-300">
            {masterGain.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
