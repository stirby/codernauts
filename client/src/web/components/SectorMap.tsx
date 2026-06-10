import type { Action, Node, Resources, Sector, Status } from '../../client.js';
import type { MapCellScan, MapCellState, ScanDirection } from '../game-model.js';
import {
  actionDirection,
  actionResolvesAt,
  claimable,
  codernautLocation,
  formatCost,
  isClaimed,
  mapModel,
  nodeSiteSummary,
  nodesFor,
  secondsUntil,
  siteRate,
  trimNumber,
} from '../game-model.js';
import { PanelTitle } from './PanelTitle.js';

/**
 * Node grid with the you-are-here marker, solid borders for claimed nodes,
 * dashed borders plus claim buttons for discovered unclaimed nodes, per-site
 * resource dots, and scan buttons on the unexplored frontier cells.
 */
export function SectorMap({
  sector,
  status,
  resources,
  sectorName,
  mutating,
  activeScan,
  clockSkewMs = 0,
  onClaim,
  onScan,
}: {
  sector: Sector | undefined;
  status: Status | undefined;
  resources: Resources | undefined;
  sectorName: string;
  mutating?: string;
  activeScan?: Action;
  clockSkewMs?: number;
  onClaim: (nodeId: string) => void;
  onScan: (direction: ScanDirection) => void;
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
          ) : cell.scan ? (
            <ScanCell
              activeScan={activeScan}
              clockSkewMs={clockSkewMs}
              key={`${cell.x}:${cell.y}`}
              mutating={mutating}
              onScan={onScan}
              scan={cell.scan}
            />
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

/**
 * Frontier cell with the scan affordance. While its direction is being
 * scanned it shows the countdown; otherwise it offers the scan button,
 * disabled while any other scan is in flight because the server allows one
 * scan at a time.
 */
function ScanCell({
  scan,
  activeScan,
  clockSkewMs,
  mutating,
  onScan,
}: {
  scan: MapCellScan;
  activeScan?: Action;
  clockSkewMs: number;
  mutating?: string;
  onScan: (direction: ScanDirection) => void;
}) {
  if (activeScan && actionDirection(activeScan) === scan.direction) {
    return (
      <div className="space-cell scan-cell scan-cell-active" role="status">
        <strong>Scanning {scan.direction}</strong>
        <span>{secondsUntil(actionResolvesAt(activeScan), Date.now() + clockSkewMs)}s remaining</span>
        <small className="muted">distance {scan.distance}</small>
      </div>
    );
  }

  const blocked = Boolean(activeScan) || mutating === 'scan';
  return (
    <div className="space-cell scan-cell">
      <span>Unexplored</span>
      <button
        aria-label={`Scan ${scan.direction}, distance ${scan.distance}`}
        disabled={blocked}
        onClick={() => onScan(scan.direction)}
        title={blocked ? 'One scan at a time. Wait for the active scan to finish.' : `Charts the next node ${scan.direction} in about ${scan.durationSeconds}s.`}
        type="button"
      >
        Scan {scan.direction}
      </button>
      <small className="muted">~{scan.durationSeconds}s, distance {scan.distance}</small>
    </div>
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
