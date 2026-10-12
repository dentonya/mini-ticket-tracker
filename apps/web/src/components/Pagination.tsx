import type { PaginationMeta } from '@mtt/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  meta: PaginationMeta | undefined;
  onPageChange: (page: number) => void;
  /** Plural noun for the total, e.g. "tickets" or "events". */
  noun: string;
}

/** Previous/Next controls; renders nothing when everything fits on one page. */
export function Pagination({ meta, onPageChange, noun }: PaginationProps) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages, total } = meta;

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-between text-body-sm text-outline"
    >
      <span className="font-mono text-mono-sm">
        Page {page} of {totalPages} · {total} {noun}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-ghost"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
