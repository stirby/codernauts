import type { ConversionRate, Crusher, Resources } from '../../client.js';
import { canUpgradeCrusher, conversionPreview, formatCost, formatGravel, resourceAmount, trimNumber, unlockedResources } from '../game-model.js';
import { PanelTitle } from './PanelTitle.js';

/**
 * Crusher controls: per-resource "Crush all" buttons with gravel previews and
 * the next upgrade with its multi-resource cost.
 */
export function CrusherPanel({
  crusher,
  rates,
  resources,
  mutating,
  onConvert,
  onUpgrade,
}: {
  crusher: Crusher | undefined;
  rates: ConversionRate[];
  resources: Resources | undefined;
  mutating?: string;
  onConvert: (resource: string) => void;
  onUpgrade: () => void;
}) {
  const multiplier = crusher?.yield_multiplier ?? 1;
  const next = crusher?.next_upgrade;
  const upgradeAffordable = canUpgradeCrusher(crusher, resources);
  const unlocked = unlockedResources(crusher);

  return (
    <section className="panel crusher-panel" aria-label="Crusher">
      <PanelTitle kicker={`Level ${crusher?.level ?? 1}`} title={crusher?.name ?? 'Crusher'} />
      <p className="muted">
        Yield x{trimNumber(multiplier)}. Accepts {unlocked.length > 0 ? unlocked.join(', ') : 'nothing yet'}.
      </p>
      <div className="crush-list">
        {rates.map((rate) => {
          const resource = rate.resource ?? 'unknown';
          const balance = Math.floor(resourceAmount(resources, resource));
          const preview = conversionPreview(balance, rate.gravel_per_unit ?? 0, multiplier);
          const locked = !rate.unlocked;
          return (
            <button
              className="crush-button"
              disabled={locked || balance < 1 || mutating === `convert-${resource}`}
              key={resource}
              onClick={() => onConvert(resource)}
              title={locked ? `Requires crusher level ${rate.required_crusher_level ?? '?'}.` : undefined}
              type="button"
            >
              <span aria-hidden="true" className={`resource-dot resource-dot-${resource}`} />
              Crush all {resource} (+{formatGravel(preview)})
            </button>
          );
        })}
        {rates.length === 0 ? <p className="muted">Conversion rates have not loaded yet.</p> : null}
      </div>
      <div className="crusher-upgrade">
        {next ? (
          <>
            <button
              disabled={!upgradeAffordable || mutating === 'upgrade-crusher'}
              onClick={onUpgrade}
              title={upgradeAffordable ? undefined : `Need ${formatCost(next.cost)}.`}
              type="button"
            >
              Upgrade to {next.name ?? `level ${next.level ?? '?'}`}
            </button>
            <span className="muted">
              {formatCost(next.cost)}
              {next.unlocks_resource ? `, unlocks ${next.unlocks_resource}` : ''}
            </span>
          </>
        ) : (
          <p className="muted">Maximum gravelization achieved.</p>
        )}
      </div>
    </section>
  );
}
