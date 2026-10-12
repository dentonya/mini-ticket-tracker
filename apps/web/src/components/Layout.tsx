import { TICKET_STATUSES } from '@mtt/shared';
import { BarChart3, Columns3, List, Plus, Ticket as TicketIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router';
import { useTicketStats } from '../api/tickets';
import { STATUS_META } from '../lib/ticket-meta';
import { CreateTicketDialog } from './CreateTicketDialog';

interface LayoutContext {
  openCreateTicket: () => void;
}

export const useLayout = () => useOutletContext<LayoutContext>();

const NAV = [
  { to: '/', label: 'Board', icon: Columns3, end: true },
  { to: '/tickets', label: 'All Tickets', icon: List, end: false },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, end: false },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors ${
    isActive
      ? 'bg-surface-high font-semibold text-on-surface'
      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
  }`;

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

export function Layout() {
  const [creating, setCreating] = useState(false);
  const openCreateTicket = useCallback(() => setCreating(true), []);
  const stats = useTicketStats();

  // "C" opens the create dialog, matching the shortcut hint in the sidebar.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'c' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      setCreating(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="min-h-screen md:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-white/5 bg-surface-low md:flex">
        <div className="flex flex-col gap-4 p-3">
          <Brand />
          <button
            type="button"
            onClick={openCreateTicket}
            className="btn-primary justify-between py-2"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Ticket
            </span>
            <kbd className="rounded bg-primary-on/15 px-1.5 font-mono text-label-xs">C</kbd>
          </button>

          <nav aria-label="Workspace" className="space-y-1">
            <p className="px-2 pb-1 font-mono text-mono-sm uppercase tracking-wider text-outline">
              Workspace
            </p>
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={navClass}>
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </span>
                {to === '/tickets' && stats.data && (
                  <span className="font-mono text-mono-sm text-outline">{stats.data.total}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <nav aria-label="Status filters" className="space-y-1">
            <p className="px-2 pb-1 font-mono text-mono-sm uppercase tracking-wider text-outline">
              By status
            </p>
            {TICKET_STATUSES.map((status) => (
              <NavLink
                key={status}
                to={`/tickets?status=${status}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`}
                    aria-hidden="true"
                  />
                  {STATUS_META[status].label}
                </span>
                <span className="font-mono text-mono-sm text-outline">
                  {stats.data?.byStatus[status] ?? '–'}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        <footer className="flex items-center justify-between bg-surface-lowest p-3 font-mono text-mono-sm text-outline">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${stats.isError ? 'bg-error' : 'bg-secondary'}`}
              aria-hidden="true"
            />
            {stats.isError ? 'API unreachable' : 'API connected'}
          </span>
          <span>v0.1</span>
        </footer>
      </aside>

      {/* Compact top bar replaces the sidebar on small screens. */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-white/5 bg-surface-low/90 px-4 py-2 backdrop-blur md:hidden">
        <Brand />
        <nav aria-label="Workspace" className="flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                `rounded p-2 ${isActive ? 'bg-surface-high text-on-surface' : 'text-outline'}`
              }
            >
              <Icon className="h-4 w-4" />
            </NavLink>
          ))}
          <button
            type="button"
            onClick={openCreateTicket}
            aria-label="New ticket"
            className="btn-primary p-2"
          >
            <Plus className="h-4 w-4" />
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <Outlet context={{ openCreateTicket } satisfies LayoutContext} />
      </main>

      <CreateTicketDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-container text-white">
        <TicketIcon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-headline-sm tracking-tight">TicketFlow</span>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-1 flex items-center gap-1.5 font-mono text-mono-sm uppercase text-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="text-[24px] font-semibold leading-8 tracking-tight md:text-headline-xl">
          {title}
        </h1>
        {description && <p className="mt-1 text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function NewTicketButton() {
  const { openCreateTicket } = useLayout();
  return (
    <button type="button" className="btn-primary" onClick={openCreateTicket}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      Add Ticket
    </button>
  );
}
