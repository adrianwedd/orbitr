import React, { useEffect, useState } from 'react';
import { useAudioStore } from '@/lib/audioStore';
import { SAMPLE_PACKS } from '@/lib/samplePacks';

export function StartupHelper() {
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { library, setSelectedTrack } = useAudioStore();

  useEffect(() => {
    // Show welcome message if no samples are loaded after 2 seconds
    const timer = setTimeout(() => {
      if (library.length === 0 && !hasInitialized) {
        setShowWelcome(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [library.length, hasInitialized]);

  useEffect(() => {
    // Auto-select first track on startup
    if (!hasInitialized) {
      setSelectedTrack('track1');
      setHasInitialized(true);
    }
  }, [hasInitialized, setSelectedTrack]);

  if (!showWelcome) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-emerald-600 to-purple-600 text-white p-4 rounded-lg shadow-lg max-w-sm border border-emerald-400">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🚀</div>
        <div>
          <h3 className="font-bold text-sm">Welcome to ORBITR!</h3>
          <p className="text-xs mt-1 opacity-90">
            Get started by loading an AI sample pack or upload your own audio files.
          </p>
          <p className="text-xs mt-2 text-emerald-200">
            <strong>Quick start:</strong> Try the "{SAMPLE_PACKS[0].name}" pack below!
          </p>
          <button
            onClick={() => setShowWelcome(false)}
            className="mt-2 text-xs underline hover:no-underline opacity-75"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}