import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { KEYBOARD_SHORTCUTS, getKeyboardShortcutDescription } from '@/lib/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  trigger?: React.ReactNode;
}

export function KeyboardShortcutsHelp({ trigger }: KeyboardShortcutsHelpProps) {
  const [open, setOpen] = useState(false);

  const shortcuts = [
    { key: KEYBOARD_SHORTCUTS.PLAY_STOP, description: 'Play/Stop sequencer' },
    { key: KEYBOARD_SHORTCUTS.GENERATE, description: 'Generate AI sample for selected step' },
    { key: KEYBOARD_SHORTCUTS.CLEAR, description: 'Clear selected step' },
    { key: KEYBOARD_SHORTCUTS.REVERSE, description: 'Toggle reverse playback' },
    { key: `${KEYBOARD_SHORTCUTS.BPM_DECREASE} / ${KEYBOARD_SHORTCUTS.BPM_INCREASE}`, description: 'Adjust BPM' },
    { key: '1-9, 0', description: 'Select steps 1-10' },
    { key: 'Q-Y', description: 'Select steps 11-16' },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger || (
          <button
            className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Show keyboard shortcuts"
          >
            ?
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-zinc-900 border border-zinc-700 p-6 shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%]">
          <Dialog.Title className="text-lg font-semibold text-zinc-100 mb-4">
            Keyboard Shortcuts
          </Dialog.Title>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-zinc-700 last:border-b-0">
                <span className="text-sm text-zinc-300">{shortcut.description}</span>
                <kbd className="px-2 py-1 bg-zinc-800 text-zinc-200 rounded text-xs font-mono border border-zinc-600">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-end">
            <Dialog.Close asChild>
              <button className="px-4 py-2 text-sm bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}