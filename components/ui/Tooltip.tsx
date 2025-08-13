import React from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  disabled?: boolean;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 200,
  disabled = false
}: TooltipProps) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <RadixTooltip.Provider delayDuration={delayDuration} skipDelayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          {children}
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            align={align}
            className="z-50 max-w-xs rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 shadow-lg border border-zinc-700 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            sideOffset={5}
          >
            {content}
            <RadixTooltip.Arrow className="fill-zinc-800" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

interface KeyboardShortcutTooltipProps {
  shortcut: string;
  description: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  disabled?: boolean;
}

export function KeyboardShortcutTooltip({
  shortcut,
  description,
  children,
  side = 'top',
  disabled = false
}: KeyboardShortcutTooltipProps) {
  const content = (
    <div className="text-center">
      <div className="font-medium">{description}</div>
      <div className="mt-1 text-xs text-zinc-400">
        Press <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-200 font-mono">{shortcut}</kbd>
      </div>
    </div>
  );

  return (
    <Tooltip content={content} side={side} disabled={disabled}>
      {children}
    </Tooltip>
  );
}