import React from 'react';
import { SampleLibraryItem } from '@/lib/types';

interface SampleLibraryProps {
  library: SampleLibraryItem[];
  onFileUpload: (files: File[]) => void;
  onAssignToStep?: (stepIdx: number, libId: string) => void;
}

export function SampleLibrary({ library, onFileUpload }: SampleLibraryProps) {
  return (
    <div className="bg-zinc-900 text-zinc-100 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Sample Library</h2>
        <span className="text-sm text-zinc-400">{library.length} samples</span>
      </div>
      
      <div className="mb-4">
        <label className="block">
          <div className="flex items-center justify-center w-full h-24 border-2 border-dashed border-zinc-700 rounded-lg hover:border-emerald-600 transition-colors cursor-pointer">
            <div className="text-center">
              <p className="text-sm text-zinc-400">Drop audio files here</p>
              <p className="text-xs text-zinc-500 mt-1">or click to browse</p>
            </div>
          </div>
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={(e) => onFileUpload(Array.from(e.target.files || []))}
            className="hidden"
          />
        </label>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {library.length === 0 && (
          <div className="text-sm text-zinc-500 text-center py-4">
            No samples loaded yet
          </div>
        )}
        {library.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 bg-zinc-800 rounded-lg hover:bg-zinc-750 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm truncate">{item.name}</span>
                {item.type === 'ai' && (
                  <span className="text-xs px-1.5 py-0.5 bg-purple-900 text-purple-300 rounded">
                    AI
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                <span>{item.duration.toFixed(2)}s</span>
                {item.prompt && (
                  <span className="truncate italic">"{item.prompt}"</span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                // Play preview
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const source = ctx.createBufferSource();
                source.buffer = item.buffer;
                source.connect(ctx.destination);
                source.start();
              }}
              className="ml-2 p-2 text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              ▶
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
