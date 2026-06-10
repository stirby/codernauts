import type { Status, SuggestedAction } from '../../client.js';
import { codernautLocation } from '../game-model.js';
import { PanelTitle } from './PanelTitle.js';

export function CaptainPanel({ status, suggested, lastUpdatedAt }: { status: Status | undefined; suggested: SuggestedAction[]; lastUpdatedAt?: Date }) {
  const player = status?.player;
  const codernaut = player?.display_name ?? player?.displayName ?? player?.name ?? player?.id ?? 'Unknown codernaut';
  const location = codernautLocation(status);
  const locationName = location.nodeName ?? status?.outpost?.name ?? location.nodeId ?? 'home node';

  return (
    <section className="panel captain-panel" aria-label="Codernaut status">
      <PanelTitle kicker="Codernaut" title={String(codernaut)} />
      <p className="big-stat">
        You are at {locationName} ({location.x},{location.y})
      </p>
      <p className="muted">Last refresh: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : 'waiting for telemetry'}</p>
      <div className="suggestions">
        {suggested.length > 0 ? (
          suggested.slice(0, 3).map((item, index) => <Suggestion key={index} value={item} />)
        ) : (
          <span className="chip">Keep the crusher fed.</span>
        )}
      </div>
    </section>
  );
}

function Suggestion({ value }: { value: SuggestedAction }) {
  if (value.message) {
    return <span className="chip">{value.message}</span>;
  }
  return <span className="chip">Explore the API for the next step.</span>;
}
