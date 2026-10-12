import { AlertTriangle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <AlertTriangle className="h-6 w-6 text-error" aria-hidden="true" />
      <p className="text-on-surface">Something went wrong loading tickets.</p>
      <p className="text-body-sm text-outline">{error.message}</p>
      <button type="button" className="btn-ghost" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <Inbox className="h-6 w-6 text-outline" aria-hidden="true" />
      <p className="text-on-surface-variant">{title}</p>
      {children}
    </div>
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-container" />
      ))}
    </div>
  );
}
