import React from 'react';
import { GenerationQueueItem } from '@/lib/types';

interface GenerationQueueProps {
  queue: GenerationQueueItem[];
}

export function GenerationQueue({ queue }: GenerationQueueProps) {
  const activeItems = queue.filter(q => q.status === 'generating');
  const completedItems = queue.filter(q => q.status === 'ready').slice(-5);
  const errorItems = queue.filter(q => q.status === 'error').slice(-3);

  return (
    <div className="bg-zinc-900 text-zinc-100 rounded-2xl p-5 shadow-xl">
      <h2 className="text-lg font-bold mb-4">Generation Queue</h2>
      
      {activeItems.length === 0 && completedItems.length === 0 && errorItems.length === 0 ? (
        <div className="text-sm text-zinc-500 text-center py-4">
          No generations yet
        </div>
      ) : (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {/* Active generations */}
          {activeItems.map((item) => (
            <div key={item.id} className="p-2 bg-purple-900/20 rounded-lg border border-purple-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-mono truncate mr-2">{item.prompt}</span>
                <span className="text-xs text-purple-400">Generating...</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${item.progress || 0}%` }}
                />
              </div>
            </div>
          ))}
          
          {/* Completed */}
          {completedItems.map((item) => (
            <div key={item.id} className="p-2 bg-emerald-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono truncate mr-2">{item.prompt}</span>
                <span className="text-xs text-emerald-400">✓ Ready</span>
              </div>
            </div>
          ))}
          
          {/* Errors */}
          {errorItems.map((item) => (
            <div key={item.id} className="p-2 bg-red-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono truncate mr-2">{item.prompt}</span>
                <span className="text-xs text-red-400">✗ Failed</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500">
          Using MusicGen backend • Draft: melody model • HQ: large model
        </p>
      </div>
    </div>
  );
}
