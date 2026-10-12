import {
  TICKET_DESCRIPTION_MAX_LENGTH,
  TICKET_PRIORITIES,
  TICKET_TITLE_MAX_LENGTH,
  type TicketPriority,
} from '@mtt/shared';
import { AlertCircle, SquarePlus, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useCreateTicket } from '../api/tickets';
import { PRIORITY_META } from '../lib/ticket-meta';
import { Dialog } from './Dialog';

interface CreateTicketDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTicketDialog({ open, onClose }: CreateTicketDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="create-ticket-title"
      className="w-[calc(100%-2rem)] max-w-2xl rounded-xl"
    >
      <CreateTicketForm onDone={onClose} />
    </Dialog>
  );
}

/** Mirrors the browser's :user-invalid state into aria-invalid for assistive technology. */
function syncAriaInvalid(el: HTMLInputElement | HTMLTextAreaElement) {
  el.setAttribute('aria-invalid', String(el.matches(':user-invalid')));
}

function CreateTicketForm({ onDone }: { onDone: () => void }) {
  const createTicket = useCreateTicket();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createTicket.mutate(
      { title: title.trim(), description: description.trim() || undefined, priority },
      { onSuccess: onDone },
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <header className="flex items-center justify-between border-b border-white/5 bg-surface-container px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-container/20 text-primary">
            <SquarePlus className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 id="create-ticket-title" className="text-headline-md">
            Create Ticket
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <kbd className="hidden rounded bg-surface-lowest px-2 py-1 font-mono text-mono-sm text-outline sm:block">
            Esc to close
          </kbd>
          <button
            type="button"
            onClick={onDone}
            aria-label="Close"
            className="rounded p-1 text-outline hover:bg-white/5 hover:text-on-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="space-y-5 px-6 py-5">
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="ticket-title" className="label">
              Ticket title <span className="text-error">*</span>
            </label>
            <span className="font-mono text-mono-sm text-outline" aria-hidden="true">
              {title.length} / {TICKET_TITLE_MAX_LENGTH}
            </span>
          </div>
          <input
            id="ticket-title"
            className="input text-body-lg"
            required
            autoFocus
            maxLength={TICKET_TITLE_MAX_LENGTH}
            pattern=".*\S.*"
            placeholder="Short summary of the issue"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => syncAriaInvalid(e.currentTarget)}
            aria-errormessage="ticket-title-error"
          />
          <p id="ticket-title-error" className="field-error">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />A title is required.
          </p>
        </div>

        <div>
          <label htmlFor="ticket-description" className="label">
            Description
          </label>
          <textarea
            id="ticket-description"
            className="input min-h-32 resize-y font-mono text-body-sm leading-relaxed"
            maxLength={TICKET_DESCRIPTION_MAX_LENGTH}
            placeholder="Steps to reproduce, expected vs. actual behaviour…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="rounded-lg bg-surface-container p-4">
          <label htmlFor="ticket-priority" className="label">
            Priority
          </label>
          <select
            id="ticket-priority"
            className="input"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
          >
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-body-sm text-outline">
            New tickets start as <span className="text-on-surface-variant">Open</span>. Change the
            status from the board or the ticket details.
          </p>
        </div>

        {createTicket.isError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded bg-error-container/30 p-3 text-body-sm text-error"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {createTicket.error.message}
          </p>
        )}
      </div>

      <footer className="flex justify-end gap-2 border-t border-white/5 px-6 py-4">
        <button type="button" className="btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={createTicket.isPending}>
          {createTicket.isPending ? 'Creating…' : 'Create ticket'}
        </button>
      </footer>
    </form>
  );
}
