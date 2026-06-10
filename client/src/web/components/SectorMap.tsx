import type { Node, Resources, Sector, Status } from '../../client.js';
import type { MapCellState } from '../game-model.js';
import { claimable, codernautLocation, formatCost, isClaimed, mapModel, nodeSiteSummary, nodesFor, siteRate, trimNumber } from '../game-model.js';
import { PanelTitle } from './PanelTitle.js';

/**
 * Node grid with the you-are-here marker, solid borders for claimed nodes,
 * dashed borders plus claim buttons for discovered unclaimed nodes, and
 * per-site resource dots.
 */
export function SectorMap({
  sector,
  status,
  resources,
  sectorName,
  mutating,
  onClaim,
}: {
  sector: Sector | undefined;
  status: Status | undefined;
  resources: Resources | undefined;
  sectorName: string;
  mutating?: string;
  onClaim: (nodeId: string) => void;
}) {
  const nodes = nodesFor(sector);
  const location = codernautLocation(status);
  const model = mapModel(nodes, location);

  return (
    <section className="panel sector-panel" aria-label="Sector map">
      <PanelTitle kicker="Map" title={sectorName} />
      <div className="map-grid" style={{ gridTemplateColumns: `repeat(${model.columns}, minmax(110px, 1fr))` }}>
        {model.cells.map((cell) =>
          cell.node ? (
            <NodeCard key={`${cell.x}:${cell.y}`} mutating={mutating} node={cell.node} onClaim={onClaim} resources={resources} state={cell.state} />
          ) : (
            <div className="space-cell" key={`${cell.x}:${cell.y}`}>
              <span>Unexplored</span>
              <small>
                {cell.x}, {cell.y}
              </small>
            </div>
          ),
        )}
      </div>
      <p className="map-legend muted">
        <span className="legend-item">
          <span aria-hidden="true" className="legend-swatch legend-home" /> you are here
        </span>
        <span className="legend-item">
          <span aria-hidden="true" className="legend-swatch legend-claimed" /> claimed
        </span>
        <span className="legend-item">
          <span aria-hidden="true" className="legend-swatch legend-unclaimed" /> discovered, unclaimed
        </span>
      </p>
    </section>
  );
}

function NodeCard({
  node,
  state,
  resources,
  mutating,
  onClaim,
}: {
  node: Node;
  state: MapCellState;
  resources: Resources | undefined;
  mutating?: string;
  onClaim: (nodeId: string) => void;
}) {
  const summary = nodeSiteSummary(node);
  const claimAllowed = claimable(node, resources);
  const claiming = mutating === `claim-${node.id}`;

  return (
    <article className={`node-card node-card-${state}`}>
      {state === 'home' ? (
        <div aria-label="You are here" className="you-marker">
          <span aria-hidden="true" className="you-marker-ring" />
          <span className="you-marker-label">YOU</span>
        </div>
      ) : null}
      <strong>{node.name ?? node.id}</strong>
      <span className="muted node-meta">
        {node.trait ?? node.kind ?? 'node'} | distance {node.distance ?? 0}
      </span>
      <div aria-label={`${summary.total} sites on ${node.name ?? node.id}`} className="site-dots">
        {(node.sites ?? []).map((site) => (
          <span
            className={`site-dot site-dot-${site.resource ?? 'unknown'}`}
            key={site.id}
            title={`${site.name ?? site.id}: ${site.resource ?? 'unknown'} ${trimNumber(siteRate(site) ?? 0)}/s`}
          />
        ))}
      </div>
      <small className="muted">
        {summary.assigned}/{summary.total} sites worked
      </small>
      {!isClaimed(node) ? (
        <button
          disabled={!claimAllowed || claiming}
          onClick={() => onClaim(node.id)}
          title={claimAllowed ? undefined : `Need ${formatCost(node.claim_cost)}.`}
          type="button"
        >
          Claim for {formatCost(node.claim_cost)}
        </button>
      ) : null}
    </article>
  );
}
