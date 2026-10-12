import { useEffect, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}

const supportsClosedBy = 'closedBy' in HTMLDialogElement.prototype;

/**
 * Native modal <dialog>: the browser provides focus trapping, Esc handling, inert background
 * and top-layer rendering. `closedby="any"` adds backdrop light-dismiss; browsers without it
 * (Safari) get an equivalent click-outside fallback.
 */
export function Dialog({ open, onClose, labelledBy, className = '', children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = ref.current;
    if (supportsClosedBy || !dialog || event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inside =
      rect.top <= event.clientY &&
      event.clientY <= rect.bottom &&
      rect.left <= event.clientX &&
      event.clientX <= rect.right;
    if (!inside) dialog.close();
  };

  return (
    <dialog
      ref={ref}
      {...{ closedby: 'any' }}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={handleBackdropClick}
      className={`border border-white/10 bg-surface-low p-0 text-on-surface shadow-[0_8px_24px_-4px_rgba(0,0,0,0.45)] ${className}`}
    >
      {/* Children mount only while open, so form state resets between openings. */}
      {open && children}
    </dialog>
  );
}
