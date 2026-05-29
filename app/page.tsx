'use client';

import OrbitrSequencer from '@/components/OrbitrSequencer';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 p-4">
      <ErrorBoundary name="Sequencer">
        <OrbitrSequencer />
      </ErrorBoundary>
    </main>
  );
}
