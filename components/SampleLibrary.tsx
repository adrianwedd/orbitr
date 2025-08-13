import React, { useState, useCallback } from 'react';
import { SampleLibraryItem } from '@/lib/types';
import { useAudioStore } from '@/lib/audioStore';
import { config, audioDebugLog } from '@/lib/config';
import { Tooltip } from './ui/Tooltip';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { useCacheManager } from '@/lib/useCacheManager';

interface SampleLibraryProps {
  library: SampleLibraryItem[];
  onFileUpload: (files: File[]) => void;
  onAssignToStep?: (stepIdx: number, libId: string) => void;
}

interface FileUploadError {
  file: string;
  error: string;
}

export function SampleLibrary({ library, onFileUpload }: SampleLibraryProps) {
  const { isLoading, loadingMessage, errorMessage, setLoading, setError, clearError } = useAudioStore();
  const [uploadErrors, setUploadErrors] = useState<FileUploadError[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [clearCacheDialogOpen, setClearCacheDialogOpen] = useState(false);
  
  const {
    cacheInfo,
    isLoading: cacheLoading,
    error: cacheError,
    clearCache,
    formatBytes,
    getCacheUsagePercentage,
    isCacheNearLimit,
    isCacheOverLimit
  } = useCacheManager();

  const validateAudioFile = useCallback((file: File): string | null => {
    // File size validation using config
    if (file.size > config.maxAudioFileSize) {
      return `File size exceeds ${Math.round(config.maxAudioFileSize / 1024 / 1024)}MB limit`;
    }

    // File type validation
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/aac'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|ogg|webm|aac)$/i)) {
      return 'Invalid audio format. Supported: WAV, MP3, OGG, WebM, AAC';
    }

    return null;
  }, []);

  const handleFileUpload = useCallback(async (files: File[]) => {
    setUploadErrors([]);
    clearError();
    
    const errors: FileUploadError[] = [];
    const validFiles: File[] = [];

    // Validate all files first
    for (const file of files) {
      const error = validateAudioFile(file);
      if (error) {
        errors.push({ file: file.name, error });
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      setUploadErrors(errors);
    }

    if (validFiles.length > 0) {
      try {
        setLoading(true, `Processing ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}...`);
        await onFileUpload(validFiles);
      } catch (error) {
        setError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }
  }, [validateAudioFile, onFileUpload, setLoading, setError, clearError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const playPreview = useCallback(async (item: SampleLibraryItem) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const source = ctx.createBufferSource();
      source.buffer = item.buffer;
      source.connect(ctx.destination);
      source.start();
      
      // Cleanup after configured duration or when buffer ends
      const cleanup = () => {
        try {
          source.disconnect();
          ctx.close();
        } catch (e) {
          // Ignore cleanup errors
        }
      };
      
      source.onended = cleanup;
      setTimeout(cleanup, config.maxPreviewDuration);
      audioDebugLog('Playing preview', { name: item.name, duration: item.duration });
    } catch (error) {
      setError(`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [setError]);

  const handleClearCache = async () => {
    const success = await clearCache();
    if (success) {
      // Show success feedback
      setTimeout(() => {
        // You could add a toast notification here
      }, 100);
    }
  };
  return (
    <div className="bg-zinc-900 text-zinc-100 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Sample Library</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">{library.length} samples</span>
          {/* Cache Management */}
          <div className="flex items-center gap-2">
            <Tooltip
              content={
                <div className="text-center">
                  <div className="font-medium">AI Sample Cache</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {formatBytes(cacheInfo.size)} / {formatBytes(cacheInfo.maxSize)}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {cacheInfo.files} cached files
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {getCacheUsagePercentage().toFixed(1)}% used
                  </div>
                </div>
              }
              side="top"
            >
              <div className="flex items-center gap-1 text-xs">
                <div className="w-16 h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      isCacheOverLimit() ? 'bg-red-500' :
                      isCacheNearLimit() ? 'bg-yellow-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, getCacheUsagePercentage())}%` }}
                  />
                </div>
                <span className={`text-xs ${
                  isCacheOverLimit() ? 'text-red-400' :
                  isCacheNearLimit() ? 'text-yellow-400' : 'text-zinc-400'
                }`}>
                  {getCacheUsagePercentage().toFixed(0)}%
                </span>
              </div>
            </Tooltip>
            
            <Tooltip content="Clear AI sample cache" side="top">
              <button
                onClick={() => setClearCacheDialogOpen(true)}
                disabled={cacheLoading || cacheInfo.size === 0}
                className="text-xs px-2 py-1 bg-zinc-700 text-zinc-300 rounded hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label="Clear cache"
              >
                Clear
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block">
          <div 
            className={`flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
              dragActive 
                ? 'border-emerald-500 bg-emerald-500/10' 
                : isLoading 
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-zinc-700 hover:border-emerald-600'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="text-center">
              {isLoading ? (
                <>
                  <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-purple-400">{loadingMessage}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-zinc-400">Drop audio files here</p>
                  <p className="text-xs text-zinc-500 mt-1">or click to browse</p>
                  <p className="text-xs text-zinc-600 mt-1">WAV, MP3, OGG, WebM, AAC • Max {Math.round(config.maxAudioFileSize / 1024 / 1024)}MB</p>
                </>
              )}
            </div>
          </div>
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
            className="hidden"
            disabled={isLoading}
          />
        </label>
        
        {/* Error Messages */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-400 text-sm">{errorMessage}</p>
            <button 
              onClick={clearError}
              className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
            >
              Dismiss
            </button>
          </div>
        )}
        
        {/* File-specific upload errors */}
        {uploadErrors.length > 0 && (
          <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
            <p className="text-yellow-400 text-sm font-medium mb-2">Some files couldn't be uploaded:</p>
            <ul className="text-yellow-300 text-xs space-y-1">
              {uploadErrors.map((err, i) => (
                <li key={i}>
                  <span className="font-mono">{err.file}</span>: {err.error}
                </li>
              ))}
            </ul>
            <button 
              onClick={() => setUploadErrors([])}
              className="mt-2 text-xs text-yellow-300 hover:text-yellow-200 underline"
            >
              Dismiss
            </button>
          </div>
        )}
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
                {item.packName && (
                  <span className="text-xs px-1.5 py-0.5 bg-emerald-900 text-emerald-300 rounded">
                    {item.packName}
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
            <Tooltip content="Play sample preview" side="top">
              <button
                onClick={() => playPreview(item)}
                className="ml-2 p-2 text-zinc-400 hover:text-emerald-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-800 rounded"
                aria-label={`Play preview of ${item.name}`}
              >
                ▶
              </button>
            </Tooltip>
          </div>
        ))}
      </div>
      
      {/* Clear Cache Confirmation Dialog */}
      <ConfirmDialog
        open={clearCacheDialogOpen}
        onOpenChange={setClearCacheDialogOpen}
        title="Clear AI Sample Cache"
        description={`Are you sure you want to clear the AI sample cache? This will remove ${formatBytes(cacheInfo.size)} of cached files (${cacheInfo.files} files). Generated samples will need to be recreated.`}
        confirmText="Clear Cache"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleClearCache}
      />
      
      {/* Cache Error Display */}
      {cacheError && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-700 rounded-lg">
          <p className="text-red-400 text-sm">{cacheError}</p>
        </div>
      )}
    </div>
  );
}
