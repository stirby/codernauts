import type { LogEntry } from '../../client.js';
import { formatDateTime } from '../game-model.js';
import { PanelTitle } from './PanelTitle.js';

export function LogPanel({ entries }: { entries: LogEntry[] }) {
  return (
    <section className="panel log-panel" aria-label="Activity log">
      <PanelTitle kicker="Captain's log" title="Recent activity" />
      {entries.length > 0 ? (
        <ol>
          {entries
            .slice()
            .reverse()
            .slice(0, 8)
            .map((entry) => (
              <li key={entry.id}>
                <span>{formatDateTime(entry.created_at ?? entry.createdAt)}</span>
                <strong>{entry.message ?? entry.id}</strong>
              </li>
            ))}
        </ol>
      ) : (
        <p className="muted">No log entries yet.</p>
      )}
    </section>
  );
}
