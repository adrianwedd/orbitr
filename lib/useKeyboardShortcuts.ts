import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsHandlers {
  onPlayStop: () => void;
  onGenerate: () => void;
  onClear: () => void;
  onReverse: () => void;
  onStepSelect: (stepIndex: number) => void;
  onBpmAdjust: (direction: 'increase' | 'decrease') => void;
}

export const KEYBOARD_SHORTCUTS = {
  PLAY_STOP: 'Space',
  GENERATE: 'G',
  CLEAR: 'C',
  REVERSE: 'R',
  BPM_INCREASE: 'ArrowRight',
  BPM_DECREASE: 'ArrowLeft',
  STEP_1: '1',
  STEP_2: '2',
  STEP_3: '3',
  STEP_4: '4',
  STEP_5: '5',
  STEP_6: '6',
  STEP_7: '7',
  STEP_8: '8',
  STEP_9: '9',
  STEP_10: '0',
  STEP_11: 'Q',
  STEP_12: 'W',
  STEP_13: 'E',
  STEP_14: 'R',
  STEP_15: 'T',
  STEP_16: 'Y',
} as const;

const STEP_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Q', 'W', 'E', 'R', 'T', 'Y'];

export function useKeyboardShortcuts(handlers: KeyboardShortcutsHandlers) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs or textareas
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as any)?.contentEditable === 'true'
    ) {
      return;
    }

    // Prevent default for our handled keys
    const key = event.code;
    const keyChar = event.key.toUpperCase();
    
    switch (key) {
      case 'Space':
        event.preventDefault();
        handlers.onPlayStop();
        break;
      case 'KeyG':
        event.preventDefault();
        handlers.onGenerate();
        break;
      case 'KeyC':
        event.preventDefault();
        handlers.onClear();
        break;
      case 'KeyR':
        // Only trigger reverse if not used for step 14
        if (!event.shiftKey) {
          event.preventDefault();
          handlers.onReverse();
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        handlers.onBpmAdjust('increase');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        handlers.onBpmAdjust('decrease');
        break;
    }

    // Handle step selection keys
    if (STEP_KEYS.includes(keyChar)) {
      event.preventDefault();
      const stepIndex = STEP_KEYS.indexOf(keyChar);
      handlers.onStepSelect(stepIndex);
    }
  }, [handlers]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export function getKeyboardShortcutDescription(action: string): string {
  switch (action) {
    case 'play_stop':
      return 'Play/Stop sequencer';
    case 'generate':
      return 'Generate AI sample for selected step';
    case 'clear':
      return 'Clear selected step';
    case 'reverse':
      return 'Toggle reverse playback';
    case 'bpm_adjust':
      return 'Adjust BPM';
    case 'step_select':
      return 'Select step';
    default:
      return '';
  }
}