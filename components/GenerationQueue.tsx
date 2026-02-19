import React from 'react';
import { GenerationQueueItem } from '@/lib/types';
import { useAudioStore } from '@/lib/audioStore';

interface GenerationQueueProps {
  queue: GenerationQueueItem[];
  embedded?: boolean;
  hideHeader?: boolean;
}

export function GenerationQueue({ queue, embedded = false, hideHeader = false }: GenerationQueueProps) {
  const { isLoading, loadingMessage } = useAudioStore();
  const activeItems = queue.filter(q => q.status === 'generating');
  const completedItems = queue.filter(q => q.status === 'ready').slice(-5);
  const errorItems = queue.filter(q => q.status === 'error').slice(-3);
  const queuedItems = queue.filter(q => q.status === 'queued');

  return (
    <div className={`${embedded ? 'text-zinc-100' : 'bg-zinc-900 text-zinc-100 rounded-2xl p-5 shadow-xl'}`}>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Generation Queue</h2>
          {(activeItems.length > 0 || isLoading) && (
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
              <span className="text-xs text-purple-400">
                {isLoading && loadingMessage ? loadingMessage : 'Generating...'}
              </span>
            </div>
          )}
        </div>
      )}
      {hideHeader && (activeItems.length > 0 || isLoading) && (
        <div className="flex justify-end mb-3">
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            <span className="text-xs text-purple-400">
              {isLoading && loadingMessage ? loadingMessage : 'Generating...'}
            </span>
          </div>
        </div>
      )}
      
      {activeItems.length === 0 && completedItems.length === 0 && errorItems.length === 0 && queuedItems.length === 0 ? (
        <div className="text-sm text-zinc-500 text-center py-4">
          No generations yet
        </div>
      ) : (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {/* Queued items */}
          {queuedItems.map((item, index) => (
            <div key={item.id} className="p-2 bg-blue-900/20 rounded-lg border border-blue-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono truncate mr-2">{item.prompt}</span>
                <span className="text-xs text-blue-400">Queued #{index + 1}</span>
              </div>
              {item.trackId && (
                <div className="text-xs text-blue-300 mt-1">Track: {item.trackId}</div>
              )}
            </div>
          ))}
          
          {/* Active generations */}
          {activeItems.map((item) => (
            <div key={item.id} className="p-2 bg-purple-900/20 rounded-lg border border-purple-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-mono truncate mr-2">{item.prompt}</span>
                <span className="text-xs text-purple-400">Generating...</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${item.progress || 0}%` }}
                />
              </div>
              {item.progress !== undefined && (
                <div className="text-xs text-purple-300 mt-1 text-right">
                  {Math.round(item.progress)}%
                </div>
              )}
              {item.trackId && (
                <div className="text-xs text-purple-300 mt-1">Track: {item.trackId}</div>
              )}
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
            <div key={item.id} className="p-2 bg-red-900/20 rounded-lg border border-red-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono truncate mr-2">{item.prompt}</span>
                <span className="text-xs text-red-400">✗ Failed</span>
              </div>
              {item.trackId && (
                <div className="text-xs text-red-300 mt-1">Track: {item.trackId}</div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {!hideHeader && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Using MusicGen backend • Draft: melody model • HQ: large model
            </p>
            {queue.length > 0 && (
              <span className="text-xs text-zinc-400">
                {activeItems.length + queuedItems.length} pending
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
