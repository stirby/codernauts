import type { Action } from '../../client.js';
import { actionDirection, actionResolvesAt, scanDirections, secondsUntil } from '../game-model.js';
import { PanelTitle } from './PanelTitle.js';

export function ScanPanel({
  active,
  disabled,
  selectedDirection,
  onDirectionChange,
  onScan,
}: {
  active: Action[];
  disabled: boolean;
  selectedDirection: (typeof scanDirections)[number];
  onDirectionChange: (direction: (typeof scanDirections)[number]) => void;
  onScan: () => void;
}) {
  return (
    <section className="panel action-panel" aria-label="Scans and actions">
      <PanelTitle kicker="Bridge" title="Scans" />
      <div className="scan-controls">
        <select
          id="scan-direction"
          name="scanDirection"
          aria-label="Scan direction"
          value={selectedDirection}
          onChange={(event) => onDirectionChange(event.target.value as (typeof scanDirections)[number])}
        >
          {scanDirections.map((direction) => (
            <option key={direction} value={direction}>
              {direction}
            </option>
          ))}
        </select>
        <button disabled={disabled} onClick={onScan} type="button">
          Start scan
        </button>
      </div>
      <p className="muted scan-note">Each scan charts the next node in that direction. Farther nodes take longer to scan.</p>
      {active.length > 0 ? (
        <div className="action-list">
          {active.map((action) => (
            <ActionCard action={action} key={action.id} />
          ))}
        </div>
      ) : (
        <p className="muted">No active actions. Start a scan to chart another node.</p>
      )}
    </section>
  );
}

function ActionCard({ action }: { action: Action }) {
  const resolvesAt = actionResolvesAt(action);
  return (
    <article className="mini-card">
      <strong>{action.type ?? 'action'}</strong>
      <span>{actionDirection(action) ?? 'unknown direction'}</span>
      <span>{secondsUntil(resolvesAt)}s remaining</span>
    </article>
  );
}
