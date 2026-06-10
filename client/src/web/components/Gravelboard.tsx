import type { Leaderboard, Status } from '../../client.js';
import { formatGravel, gravelPerHour, gravelTotal, isYou, leaderboardEntries, seasonName, trimNumber } from '../game-model.js';
import { PanelTitle } from './PanelTitle.js';

/**
 * The season scoreboard. One metric: cumulative gravel. Gravel-per-hour is
 * shown as a slope stat, not a ranking.
 */
export function Gravelboard({ leaderboard, status }: { leaderboard?: Leaderboard; status?: Status }) {
  const entries = leaderboardEntries(leaderboard);
  const season = leaderboard?.season?.name ?? seasonName(status);
  const leaderGravel = Math.max(entries[0]?.gravel ?? 0, 1);

  return (
    <section className="panel gravelboard-panel" aria-label="Gravelboard">
      <div className="panel-heading-row">
        <PanelTitle kicker={season} title="Gravelboard" />
        <span className="chip">season score</span>
      </div>
      <p className="gravel-total" aria-label="Your season gravel total">
        {formatGravel(gravelTotal(status))}
      </p>
      <p className="gravel-slope">
        <span className="muted">gravel banked, slope</span> <strong>+{trimNumber(gravelPerHour(status))}/hr</strong>
      </p>
      {entries.length > 0 ? (
        <ol className="gravel-entries">
          {entries.map((entry, index) => {
            const rank = entry.rank ?? index + 1;
            const you = isYou(entry);
            const width = Math.min(100, Math.max(2, ((entry.gravel ?? 0) / leaderGravel) * 100));
            return (
              <li className={you ? 'gravel-entry gravel-entry-you' : 'gravel-entry'} key={entry.player_id ?? rank}>
                <span className={`rank-medal ${rankClass(rank)}`}>{rank}</span>
                <div className="gravel-entry-body">
                  <div className="gravel-entry-row">
                    <strong>{entry.codernaut ?? entry.player_id ?? 'unknown codernaut'}</strong>
                    {you ? <span className="you-badge">YOU</span> : null}
                    <span className="gravel-entry-score">{formatGravel(entry.gravel ?? 0)}</span>
                  </div>
                  <div className="gravel-bar-track" aria-hidden="true">
                    <span style={{ width: `${width}%` }} />
                  </div>
                  <small className="muted">{trimNumber(entry.gravel_per_hour ?? 0)} gravel/hr</small>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="muted">No codernauts on the board yet. Crush something.</p>
      )}
    </section>
  );
}

function rankClass(rank: number): string {
  if (rank === 1) {
    return 'rank-gold';
  }
  if (rank === 2) {
    return 'rank-silver';
  }
  if (rank === 3) {
    return 'rank-bronze';
  }
  return 'rank-plain';
}
