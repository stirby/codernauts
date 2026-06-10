import type { Resources } from '../../client.js';
import { resourceNames } from '../../client.js';
import { energyCapacity, energyUsed, formatRate, resourceAmount, resourcePercent, resourceRate, trimNumber } from '../game-model.js';
import { PanelTitle } from './PanelTitle.js';

/** Four uncapped resources with per-second rates plus the energy capacity line. */
export function ResourcePanel({ resources }: { resources: Resources | undefined }) {
  return (
    <section className="panel resource-panel" aria-label="Resources">
      <PanelTitle kicker="Hold" title="Resources" />
      <ul className="resource-lines">
        {resourceNames.map((name) => (
          <li className="resource-line" key={name}>
            <span aria-hidden="true" className={`resource-dot resource-dot-${name}`} />
            <span className="resource-name">{name}</span>
            <strong>{trimNumber(Math.floor(resourceAmount(resources, name)))}</strong>
            <small className="muted">{formatRate(resourceRate(resources, name))}</small>
          </li>
        ))}
      </ul>
      <EnergyMeter resources={resources} />
    </section>
  );
}

function EnergyMeter({ resources }: { resources: Resources | undefined }) {
  const used = energyUsed(resources);
  const capacity = energyCapacity(resources);
  return (
    <div className="resource-meter">
      <div className="resource-row">
        <span>Energy capacity</span>
        <strong>
          {trimNumber(used)}
          {typeof capacity === 'number' ? ` / ${trimNumber(capacity)}` : ''}
        </strong>
      </div>
      <div className="meter-track" aria-label="Energy capacity meter">
        <span style={{ width: `${resourcePercent(used, capacity)}%` }} />
      </div>
      <small>used by assigned miners</small>
    </div>
  );
}
