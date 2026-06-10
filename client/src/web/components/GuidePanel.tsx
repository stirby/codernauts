import type { Action, Miner } from '../../client.js';
import { PanelTitle } from './PanelTitle.js';

/** One-sentence explanations of the gravel loop, kept lighthearted. */
export function GuidePanel({ idleMiners: idle, hasUnclaimedNode, scan }: { idleMiners: Miner[]; hasUnclaimedNode: boolean; scan?: Action }) {
  return (
    <section className="panel guide-panel" aria-label="Beginner guide">
      <PanelTitle kicker="Flight manual" title="The gravel loop" />
      <ul>
        <li>Collect: assigned miners stack up ore, ice, gas, and crystal while you do literally anything else.</li>
        <li>Expand: scan for new nodes, then claim them to open their mining sites.</li>
        <li>Crush: feed spare resources to the crusher, because gravel is the only score there is.</li>
        <li>Climb: the gravelboard ranks codernauts by season gravel, so keep the crusher fed.</li>
        {scan ? <li>Let the active scan finish; the map updates on its own.</li> : null}
        {idle.length > 0 ? <li>An idle miner is drifting; assign it to an open site on a claimed node.</li> : null}
        {hasUnclaimedNode ? <li>A discovered node sits unclaimed; grab it from the map once you can afford it.</li> : null}
        <li>Open the CLI or source files to see how this GUI calls the same API.</li>
      </ul>
    </section>
  );
}
