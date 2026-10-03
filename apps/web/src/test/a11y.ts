import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * runs axe (the engine behind most accessibility checkers) over what's on screen
 * colour contrast is skipped because jsdom can't work out real colours, that's checked by hand
 */
export async function expectNoA11yProblems(root: Element = document.body) {
  const results = await axe.run(root, {
    rules: {
      'color-contrast': { enabled: false },
      // the page shell is rendered on its own in tests, so it can't have a full set of landmarks
      region: { enabled: false },
    },
  });
  const problems = results.violations.map(
    (v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`,
  );
  expect(problems, problems.join('\n\n')).toEqual([]);
}
