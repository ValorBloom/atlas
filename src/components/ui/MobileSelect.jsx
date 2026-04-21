/**
 * MobileSelect — drop-in replacement for shadcn Select.
 * On mobile (touch devices) opens a Vaul bottom-sheet drawer.
 * On desktop falls back to the native shadcn Select.
 *
 * Usage:
 *   <MobileSelect value={val} onValueChange={setVal} placeholder="Pick one">
 *     <MobileSelectItem value="a">Option A</MobileSelectItem>
 *     <MobileSelectItem value="b">Option B</MobileSelectItem>
 *   </MobileSelect>
 */
import React, { useState, Children } from 'react';
import { Drawer } from 'vaul';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Detect touch-primary devices
const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

/** Marker component — data extracted by MobileSelect */
export function MobileSelectItem({ value, children }) {
  return null;
}

export function MobileSelect({ value, onValueChange, placeholder, children, className, disabled }) {
  const [open, setOpen] = useState(false);
  const touch = isTouchDevice();

  // Extract options from MobileSelectItem children
  const options = Children.toArray(children)
    .filter(c => c?.props?.value !== undefined)
    .map(c => ({ value: c.props.value, label: c.props.children }));

  const selected = options.find(o => o.value === value);
  const displayLabel = selected?.label ?? placeholder ?? 'Select…';

  if (!touch) {
    // Desktop: native shadcn popover select
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Mobile: Vaul drawer bottom-sheet
  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          <span className="line-clamp-1">{displayLabel}</span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-card border-t border-border">
          {/* Drag handle */}
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border shrink-0" />
          {/* Sheet title */}
          {placeholder && (
            <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest py-3 px-4 border-b border-border">
              {placeholder}
            </p>
          )}
          {/* Options list */}
          <div
            className="overflow-y-auto max-h-[60vh] p-2"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
          >
            {options.map(o => {
              const isSelected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onValueChange?.(o.value); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-muted/50 active:bg-muted/70 text-foreground'
                  )}
                >
                  <span>{o.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}