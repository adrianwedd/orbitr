import React, { useState } from 'react';
import { Step, SampleLibraryItem } from '@/lib/types';

interface StepEditorProps {
  steps: Step[];
  onStepChange: (idx: number, patch: Partial<Step>) => void;
  onAssign: (stepIdx: number, libId: string) => void;
  onGenerate: (prompt: string, stepIdx?: number, options?: any) => Promise<any>;
  library: SampleLibraryItem[];
}

export function StepEditor({ 
  steps, 
  onStepChange, 
  onAssign, 
  onGenerate, 
  library 
}: StepEditorProps) {
  const [focused, setFocused] = useState(0);
  const [generatingStep, setGeneratingStep] = useState<number | null>(null);
  const s = steps[focused];

  const handleGenerate = async () => {
    if (!s.prompt) return;
    setGeneratingStep(focused);
    try {
      await onGenerate(s.prompt, focused, { quality: 'draft' });
    } finally {
      setGeneratingStep(null);
    }
  };

  const handleGenerateHQ = async () => {
    if (!s.prompt) return;
    setGeneratingStep(focused);
    try {
      await onGenerate(s.prompt, focused, { quality: 'high' });
    } finally {
      setGeneratingStep(null);
    }
  };

  return (
    <div className="bg-zinc-900 text-zinc-100 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Step Editor</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-400">Step</label>
          <select
            className="bg-zinc-800 rounded-lg px-3 py-1.5 text-sm font-medium"
            value={focused}
            onChange={(e) => setFocused(parseInt(e.target.value, 10))}
          >
            {steps.map((_, i) => (
              <option key={i} value={i}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {/* Sample Assignment */}
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-500 mb-1 block">
            Assigned Sample
          </label>
          <div className="flex items-center gap-2">
            <select
              className="bg-zinc-800 rounded-lg px-3 py-2 text-sm w-full"
              value=""
              onChange={(e) => onAssign(focused, e.target.value)}
            >
              <option value="" disabled>
                {s.buffer ? s.name : "— Choose from library —"}
              </option>
              {library.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.type === 'ai' && '✨'}
                </option>
              ))}
            </select>
            <button
              className={`px-3 py-2 rounded-lg font-medium transition-all ${
                s.active 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                  : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
              }`}
              onClick={() => onStepChange(focused, { active: !s.active })}
            >
              {s.active ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-500 mb-1 block">
              Gain
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={s.gain}
              onChange={(e) => onStepChange(focused, { gain: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="text-right text-xs text-zinc-400 mt-1">
              {s.gain.toFixed(2)}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-500 mb-1 block">
              Probability
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={s.prob}
              onChange={(e) => onStepChange(focused, { prob: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="text-right text-xs text-zinc-400 mt-1">
              {(s.prob * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* AI Generation */}
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-500 mb-1 block">
            AI Prompt
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="bg-zinc-800 rounded-lg px-3 py-2 text-sm w-full"
              placeholder="e.g., lofi kick drum with vinyl warmth"
              value={s.prompt}
              onChange={(e) => onStepChange(focused, { prompt: e.target.value })}
            />
            <div className="flex gap-1">
              <button
                className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                onClick={handleGenerate}
                disabled={!s.prompt || generatingStep !== null}
              >
                {generatingStep === focused ? "..." : "Draft"}
              </button>
              <button
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                onClick={handleGenerateHQ}
                disabled={!s.prompt || generatingStep !== null}
              >
                HQ
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Draft: Fast generation (melody model) • HQ: High quality (large model)
          </p>
        </div>

        {/* Step Conditions (Advanced) */}
        <details className="group">
          <summary className="text-xs uppercase tracking-wide text-zinc-500 cursor-pointer hover:text-zinc-400">
            Advanced Options ▸
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs text-zinc-500">Step Condition</label>
              <select
                className="bg-zinc-800 rounded-lg px-3 py-2 text-sm w-full mt-1"
                value={s.condition || 'always'}
                onChange={(e) => onStepChange(focused, { condition: e.target.value })}
              >
                <option value="always">Always</option>
                <option value="fill">Fill (last bar)</option>
                <option value="not_fill">Not Fill</option>
                <option value="50%">50% Chance</option>
                <option value="75%">75% Chance</option>
              </select>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
