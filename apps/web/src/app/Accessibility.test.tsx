import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it } from 'vitest';
import { SEED_IDS } from '../mocks/seed';
import { expectNoA11yProblems } from '../test/a11y';
import { renderApp } from '../test/renderApp';

/** automated accessibility checks on every main screen */
describe('accessibility', () => {
  it('explore, orbit view', async () => {
    renderApp(`/?person=${SEED_IDS.engineeringManager}`);
    await screen.findByRole('heading', { level: 1 });
    await expectNoA11yProblems();
  });

  it('explore, levels view', async () => {
    renderApp(`/?person=${SEED_IDS.engineeringManager}&view=levels`);
    await screen.findByRole('region', { name: 'Levels view' });
    await expectNoA11yProblems();
  });

  it('people page', async () => {
    renderApp('/people');
    await screen.findByRole('table');
    await expectNoA11yProblems();
  });

  it('people page with search results open', async () => {
    renderApp('/people');
    await screen.findByRole('table');
    await userEvent.type(screen.getByRole('combobox', { name: 'Find someone' }), 'jo');
    await expectNoA11yProblems();
  });

  it('add employee form with errors showing', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await userEvent.click(screen.getByRole('button', { name: 'Add employee' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Add employee' }),
    );
    await expectNoA11yProblems();
  });

  it('delete confirmation', async () => {
    renderApp(`/?person=${SEED_IDS.engineeringManager}`);
    await screen.findByRole('heading', { level: 1 });
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await expectNoA11yProblems();
  });
});
