import type { Cost, Miner, Resources, Sector } from '../../client.js';
import {
  allSites,
  assignedSiteID,
  canAfford,
  canAssignMiner,
  formatCost,
  formatRate,
  minerEnergyRequirement,
  minerRate,
  openSites,
  siteByID,
  upgradeCost,
} from '../game-model.js';
import { PanelTitle } from './PanelTitle.js';

/**
 * Miner fleet: build, upgrade (which adds energy capacity), and assignment to
 * open sites on claimed nodes only.
 */
export function FleetPanel({
  miners,
  sector,
  resources,
  assignSelections,
  mutating,
  canBuildMiner,
  buildCost: minerBuildCost,
  onBuild,
  onUpgrade,
  onAssign,
  onSelectSite,
}: {
  miners: Miner[];
  sector: Sector | undefined;
  resources: Resources | undefined;
  assignSelections: Record<string, string>;
  mutating?: string;
  canBuildMiner: boolean;
  buildCost?: Cost;
  onBuild: () => void;
  onUpgrade: (minerID: string) => void;
  onAssign: (minerID: string) => void;
  onSelectSite: (minerID: string, siteID: string) => void;
}) {
  return (
    <section className="panel fleet-panel" aria-label="Miner fleet">
      <div className="panel-heading-row">
        <PanelTitle kicker="Fleet" title="Miners" />
        <button disabled={!canBuildMiner || mutating === 'build'} onClick={onBuild} title={canBuildMiner ? undefined : 'Need more ore.'} type="button">
          Build miner
        </button>
      </div>
      <p className="muted">Build cost: {formatCost(minerBuildCost)}. Upgrades raise output and add energy capacity.</p>
      <div className="miner-list">
        {miners.map((miner) => (
          <MinerCard
            assignSelection={assignSelections[miner.id] ?? assignedSiteID(miner) ?? ''}
            key={miner.id}
            miner={miner}
            mutating={mutating}
            onAssign={onAssign}
            onSelectSite={onSelectSite}
            onUpgrade={onUpgrade}
            resources={resources}
            sector={sector}
          />
        ))}
      </div>
    </section>
  );
}

function MinerCard({
  miner,
  sector,
  resources,
  assignSelection,
  mutating,
  onUpgrade,
  onAssign,
  onSelectSite,
}: {
  miner: Miner;
  sector: Sector | undefined;
  resources: Resources | undefined;
  assignSelection: string;
  mutating?: string;
  onUpgrade: (minerID: string) => void;
  onAssign: (minerID: string) => void;
  onSelectSite: (minerID: string, siteID: string) => void;
}) {
  const currentSite = siteByID(allSites(sector), assignedSiteID(miner));
  const targetSites = openSites(sector, miner.id);
  const cost = upgradeCost(miner);
  const canUpgrade = canAfford(resources, cost);
  const assigning = mutating === `assign-${miner.id}`;
  const upgrading = mutating === `upgrade-${miner.id}`;
  const assignable = canAssignMiner(resources, miner);

  return (
    <article className="miner-card">
      <div className="miner-avatar" />
      <div>
        <h3>{miner.name ?? miner.id}</h3>
        <p className="muted">{miner.id}</p>
      </div>
      <dl>
        <div>
          <dt>Level</dt>
          <dd>{miner.level ?? 1}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{miner.status ?? 'ready'}</dd>
        </div>
        <div>
          <dt>Mining</dt>
          <dd>{miner.resource ?? 'nothing yet'}</dd>
        </div>
        <div>
          <dt>Rate</dt>
          <dd>{formatRate(minerRate(miner))}</dd>
        </div>
        <div>
          <dt>Energy required</dt>
          <dd>{minerEnergyRequirement(miner)}</dd>
        </div>
        <div>
          <dt>Assigned</dt>
          <dd>{currentSite?.name ?? assignedSiteID(miner) ?? 'none'}</dd>
        </div>
      </dl>
      <div className="miner-actions">
        <button
          disabled={!canUpgrade || upgrading}
          onClick={() => onUpgrade(miner.id)}
          title={canUpgrade ? 'Adds output and energy capacity.' : `Need ${formatCost(cost)}.`}
          type="button"
        >
          Upgrade
        </button>
        <span className="muted">{formatCost(cost)}</span>
      </div>
      <div className="assign-row">
        <select
          id={`assign-site-${miner.id}`}
          name={`assign-site-${miner.id}`}
          aria-label={`Assign ${miner.name ?? miner.id} to a site`}
          value={assignSelection}
          onChange={(event) => onSelectSite(miner.id, event.target.value)}
        >
          <option value="">Choose site</option>
          {targetSites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name ?? site.id}
            </option>
          ))}
        </select>
        <button
          disabled={!assignSelection || assigning || !assignable}
          onClick={() => onAssign(miner.id)}
          title={assignable ? undefined : 'Need more energy capacity.'}
          type="button"
        >
          Assign
        </button>
      </div>
    </article>
  );
}
