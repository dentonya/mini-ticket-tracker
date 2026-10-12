import { TICKET_DESCRIPTION_MAX_LENGTH, TICKET_TITLE_MAX_LENGTH, type Ticket } from '@mtt/shared';
import { AlertCircle, Pencil, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useDeleteTicket, useUpdateTicket } from '../api/tickets';
import { syncAriaInvalid } from '../lib/forms';
import { formatDateTime, ticketKey, timeAgo } from '../lib/ticket-meta';
import { PriorityBadge, StatusBadge } from './Badges';
import { Dialog } from './Dialog';
import { TicketFieldSelect } from './TicketFieldSelect';

interface TicketDrawerProps {
  ticket: Ticket | null;
  onClose: () => void;
}

export function TicketDrawer({ ticket, onClose }: TicketDrawerProps) {
  return (
    <Dialog
      open={ticket !== null}
      onClose={onClose}
      labelledBy="ticket-drawer-title"
      // Pinned to the right edge explicitly rather than relying on the UA's centring margins,
      // which can push a full-height dialog partly off-screen.
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-lg rounded-none border-y-0 border-r-0"
    >
      {ticket && <TicketDetail key={ticket.id} initial={ticket} onClose={onClose} />}
    </Dialog>
  );
}

type Mode = 'view' | 'edit' | 'confirm-delete';

function TicketDetail({ initial, onClose }: { initial: Ticket; onClose: () => void }) {
  // The drawer holds its own copy so edits made here show immediately, without waiting for
  // the parent's list query to refetch.
  const [ticket, setTicket] = useState(initial);
  const [mode, setMode] = useState<Mode>('view');
  const deleteTicket = useDeleteTicket();

  return (
    <article className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-white/5 px-6 py-3">
        <nav
          className="flex items-center gap-2 font-mono text-mono-sm text-outline"
          aria-label="Breadcrumb"
        >
          <span>Tickets</span>
          <span aria-hidden="true">/</span>
          <span className="text-on-surface">{ticketKey(ticket.id)}</span>
        </nav>
        <div className="flex items-center gap-1">
          {mode === 'view' && (
            <>
              <button type="button" className="btn-ghost" onClick={() => setMode('edit')}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </button>
              <button
                type="button"
                className="btn-ghost hover:border-red-400/40 hover:text-red-300"
                onClick={() => setMode('confirm-delete')}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close ticket details"
            className="ml-1 rounded p-1 text-outline hover:bg-white/5 hover:text-on-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {mode === 'confirm-delete' && (
        <div
          role="alertdialog"
          aria-labelledby="delete-confirm-title"
          className="flex flex-wrap items-center justify-between gap-3 border-b border-red-400/20 bg-red-500/10 px-6 py-3"
        >
          <div>
            <p id="delete-confirm-title" className="font-medium text-red-200">
              Delete {ticketKey(ticket.id)}?
            </p>
            <p className="text-body-sm text-red-200/70">This permanently removes the ticket.</p>
            {deleteTicket.isError && (
              <p role="alert" className="mt-1 text-body-sm text-error">
                {deleteTicket.error.message}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost"
              autoFocus
              onClick={() => setMode('view')}
              disabled={deleteTicket.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn bg-red-500 text-white hover:bg-red-600"
              disabled={deleteTicket.isPending}
              onClick={() => deleteTicket.mutate(ticket.id, { onSuccess: onClose })}
            >
              {deleteTicket.isPending ? 'Deleting…' : 'Delete ticket'}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        {mode === 'edit' ? (
          <EditTicketForm
            ticket={ticket}
            onSaved={(saved) => {
              setTicket(saved);
              setMode('view');
            }}
            onCancel={() => setMode('view')}
          />
        ) : (
          <div className="space-y-3">
            <p className="font-mono text-mono-sm text-outline">
              Created {timeAgo(ticket.createdAt)}
            </p>
            <h2 id="ticket-drawer-title" className="break-words text-headline-md leading-snug">
              {ticket.title}
            </h2>
            <div className="flex gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
          </div>
        )}

        <section className="card p-4">
          <h3 className="mb-3 text-headline-sm">Properties</h3>
          <dl className="grid grid-cols-[7rem_1fr] items-center gap-y-3 text-body-md">
            <dt className="text-outline">Status</dt>
            <dd>
              <TicketFieldSelect ticket={ticket} field="status" onUpdated={setTicket} />
            </dd>
            <dt className="text-outline">Priority</dt>
            <dd>
              <TicketFieldSelect ticket={ticket} field="priority" onUpdated={setTicket} />
            </dd>
            <dt className="text-outline">Created</dt>
            <dd className="font-mono text-mono-sm">{formatDateTime(ticket.createdAt)}</dd>
          </dl>
        </section>

        {mode !== 'edit' && (
          <section className="card p-4">
            <h3 className="mb-3 text-headline-sm">Description</h3>
            {ticket.description ? (
              <p className="whitespace-pre-wrap break-words text-on-surface-variant">
                {ticket.description}
              </p>
            ) : (
              <p className="italic text-outline">No description provided.</p>
            )}
          </section>
        )}
      </div>
    </article>
  );
}

interface EditTicketFormProps {
  ticket: Ticket;
  onSaved: (ticket: Ticket) => void;
  onCancel: () => void;
}

function EditTicketForm({ ticket, onSaved, onCancel }: EditTicketFormProps) {
  const updateTicket = useUpdateTicket();
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description ?? '');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateTicket.mutate(
      { id: ticket.id, title: title.trim(), description: description.trim() },
      { onSuccess: onSaved },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-labelledby="ticket-drawer-title">
      <h2 id="ticket-drawer-title" className="text-headline-sm">
        Edit ticket
      </h2>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="edit-title" className="label">
            Title <span className="text-error">*</span>
          </label>
          <span className="font-mono text-mono-sm text-outline" aria-hidden="true">
            {title.length} / {TICKET_TITLE_MAX_LENGTH}
          </span>
        </div>
        <input
          id="edit-title"
          className="input"
          required
          autoFocus
          maxLength={TICKET_TITLE_MAX_LENGTH}
          pattern=".*\S.*"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={(e) => syncAriaInvalid(e.currentTarget)}
          aria-errormessage="edit-title-error"
        />
        <p id="edit-title-error" className="field-error">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />A title is required.
        </p>
      </div>
      <div>
        <label htmlFor="edit-description" className="label">
          Description
        </label>
        <textarea
          id="edit-description"
          className="input min-h-40 resize-y font-mono text-body-sm leading-relaxed"
          maxLength={TICKET_DESCRIPTION_MAX_LENGTH}
          placeholder="Leave empty to remove the description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {updateTicket.isError && (
        <p role="alert" className="flex items-start gap-2 text-body-sm text-error">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {updateTicket.error.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={updateTicket.isPending}>
          {updateTicket.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
