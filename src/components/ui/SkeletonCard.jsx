import React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted/60', className)} />
  );
}

export function SkeletonTile() {
  return (
    <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
      <Skeleton className="w-9 h-9 rounded-lg" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-2.5 w-14" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-5 h-5 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTile key={i} />
      ))}
    </div>
  );
}