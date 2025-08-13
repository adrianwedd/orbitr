import React, { useState } from 'react';
import { Step, SampleLibraryItem } from '@/lib/types';
import { Tooltip, KeyboardShortcutTooltip } from './ui/Tooltip';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { KEYBOARD_SHORTCUTS, getKeyboardShortcutDescription } from '@/lib/useKeyboardShortcuts';

interface StepEditorProps {
  steps: Step[];
  onStepChange: (idx: number, patch: Partial<Step>) => void;
  onAssign: (stepIdx: number, libId: string) => void;
  onGenerate: (prompt: string, stepIdx?: number, options?: any) => Promise<any>;
  onClear: (stepIdx: number) => void;
  library: SampleLibraryItem[];
}

export function StepEditor({ 
  steps, 
  onStepChange, 
  onAssign, 
  onGenerate, 
  onClear,
  library 
}: StepEditorProps) {
  const [focused, setFocused] = useState(0);
  const [generatingStep, setGeneratingStep] = useState<number | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const s = steps[focused];

  const handleClearStep = () => {
    onClear(focused);
  };

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
          <Tooltip content="Select step to edit (use 1-9, 0, Q-Y keys)" side="top">
            <label className="text-sm text-zinc-400 cursor-help">Step</label>
          </Tooltip>
          <select
            className="bg-zinc-800 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={focused}
            onChange={(e) => setFocused(parseInt(e.target.value, 10))}
            aria-label="Select step to edit"
          >
            {steps.map((_, i) => (
              <option key={i} value={i}>
                Step {i + 1}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {/* Sample Assignment */}
        <div>
          <Tooltip content="Assign a sample from the library to this step" side="top">
            <label className="text-xs uppercase tracking-wide text-zinc-500 mb-1 block cursor-help">
              Assigned Sample
            </label>
          </Tooltip>
          <div className="flex items-center gap-2">
            <select
              className="bg-zinc-800 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              value=""
              onChange={(e) => onAssign(focused, e.target.value)}
              aria-label={`Assign sample to step ${focused + 1}`}
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
            <Tooltip content={`${s.active ? 'Deactivate' : 'Activate'} this step`} side="top">
              <button
                className={`px-3 py-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  s.active 
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-400" 
                    : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300 focus:ring-blue-400"
                }`}
                onClick={() => onStepChange(focused, { active: !s.active })}
                aria-label={`${s.active ? 'Deactivate' : 'Activate'} step ${focused + 1}`}
                aria-pressed={s.active}
              >
                {s.active ? "ON" : "OFF"}
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Tooltip content="Volume level for this step (0-100%)" side="top">
              <label className="text-xs uppercase tracking-wide text-zinc-500 mb-1 block cursor-help">
                Gain
              </label>
            </Tooltip>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={s.gain}
              onChange={(e) => onStepChange(focused, { gain: parseFloat(e.target.value) })}
              className="w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label={`Step ${focused + 1} gain: ${(s.gain * 100).toFixed(0)}%`}
            />
            <div className="text-right text-xs text-zinc-400 mt-1">
              {s.gain.toFixed(2)}
            </div>
          </div>

          <div>
            <Tooltip content="Chance this step will trigger (0-100%)" side="top">
              <label className="text-xs uppercase tracking-wide text-zinc-500 mb-1 block cursor-help">
                Probability
              </label>
            </Tooltip>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={s.prob}
              onChange={(e) => onStepChange(focused, { prob: parseFloat(e.target.value) })}
              className="w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label={`Step ${focused + 1} probability: ${(s.prob * 100).toFixed(0)}%`}
            />
            <div className="text-right text-xs text-zinc-400 mt-1">
              {(s.prob * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* AI Generation */}
        <div>
          <Tooltip content="Describe the sound you want AI to generate" side="top">
            <label className="text-xs uppercase tracking-wide text-zinc-500 mb-1 block cursor-help">
              AI Prompt
            </label>
          </Tooltip>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="bg-zinc-800 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="e.g., lofi kick drum with vinyl warmth"
              value={s.prompt}
              onChange={(e) => onStepChange(focused, { prompt: e.target.value })}
              aria-label={`AI prompt for step ${focused + 1}`}
            />
            <div className="flex gap-1">
              <KeyboardShortcutTooltip
                shortcut={KEYBOARD_SHORTCUTS.GENERATE}
                description={getKeyboardShortcutDescription('generate')}
                side="top"
              >
                <button
                  className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-purple-400"
                  onClick={handleGenerate}
                  disabled={!s.prompt || generatingStep !== null}
                  aria-label="Generate draft quality sample"
                >
                  {generatingStep === focused ? "..." : "Draft"}
                </button>
              </KeyboardShortcutTooltip>
              <Tooltip content="Generate high quality sample (slower)" side="top">
                <button
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  onClick={handleGenerateHQ}
                  disabled={!s.prompt || generatingStep !== null}
                  aria-label="Generate high quality sample"
                >
                  HQ
                </button>
              </Tooltip>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Draft: Fast generation (small model) • HQ: High quality (melody model)
          </p>
          
          {/* Clear Step Button */}
          {s.buffer && (
            <div className="mt-3">
              <KeyboardShortcutTooltip
                shortcut={KEYBOARD_SHORTCUTS.CLEAR}
                description={getKeyboardShortcutDescription('clear')}
                side="top"
              >
                <button
                  onClick={() => setClearDialogOpen(true)}
                  className="w-full px-3 py-2 text-sm bg-zinc-700 text-zinc-300 rounded-lg hover:bg-red-600 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-red-400"
                  aria-label={`Clear sample from step ${focused + 1}`}
                >
                  Clear Step Sample
                </button>
              </KeyboardShortcutTooltip>
            </div>
          )}
        </div>

        {/* Step Conditions (Advanced) */}
        <details className="group">
          <Tooltip content="Advanced playback conditions for this step" side="top">
            <summary className="text-xs uppercase tracking-wide text-zinc-500 cursor-pointer hover:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded">
              Advanced Options ▸
            </summary>
          </Tooltip>
          <div className="mt-3 space-y-3">
            <div>
              <Tooltip content="When this step should trigger during playback" side="top">
                <label className="text-xs text-zinc-500 cursor-help">Step Condition</label>
              </Tooltip>
              <select
                className="bg-zinc-800 rounded-lg px-3 py-2 text-sm w-full mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={s.condition || 'always'}
                onChange={(e) => onStepChange(focused, { condition: e.target.value })}
                aria-label={`Step ${focused + 1} trigger condition`}
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
      
      {/* Clear Step Confirmation Dialog */}
      <ConfirmDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        title="Clear Step Sample"
        description={`Are you sure you want to clear the sample from step ${focused + 1}? This will remove the assigned sample but keep the step settings.`}
        confirmText="Clear Sample"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleClearStep}
      />
    </div>
  );
}
