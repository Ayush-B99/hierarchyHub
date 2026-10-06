import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { accounts } from '../../mocks/accounts';
import { SEED_IDS } from '../../mocks/seed';
import { expectNoA11yProblems } from '../../test/a11y';
import { renderApp } from '../../test/renderApp';

const editRole = async (person: string, role: string) => {
  const { router } = renderApp(`/?person=${person}`);
  await screen.findByRole('heading', { level: 1 });
  await userEvent.click(screen.getByRole('button', { name: 'Edit details' }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.clear(within(dialog).getByLabelText('Role'));
  await userEvent.type(within(dialog).getByLabelText('Role'), role);
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
  // the dialog closes once it's saved
  await screen.findAllByText(role);
  return router;
};

describe('the audit page', () => {
  it('shows who changed what, with before and after', async () => {
    const router = await editRole(SEED_IDS.seniorEngineer, 'Lead Engineer');
    await router.navigate('/audit');
    const list = await screen.findByRole('list', { name: 'Events, newest first' });
    expect(within(list).getAllByText('Thandi Nkosi changed Ruan Botha').length).toBeGreaterThan(0);
    expect(
      within(list).getByText('role from Senior Engineer to Lead Engineer'),
    ).toBeInTheDocument();
  });

  it('opens one person’s history from their details', async () => {
    const router = await editRole(SEED_IDS.seniorEngineer, 'Lead Engineer');
    await router.navigate(`/?person=${SEED_IDS.seniorEngineer}`);
    await userEvent.click(await screen.findByRole('link', { name: 'View history' }));
    expect(router.state.location.search).toBe(`?person=${SEED_IDS.seniorEngineer}`);
    expect((await screen.findAllByText('Thandi Nkosi changed Ruan Botha')).length).toBeGreaterThan(
      0,
    );
  });

  it('filters by what happened', async () => {
    const router = await editRole(SEED_IDS.seniorEngineer, 'Lead Engineer');
    await router.navigate('/audit');
    await userEvent.selectOptions(
      await screen.findByLabelText('What happened'),
      'Accounts approved',
    );
    expect(await screen.findByText('Nothing has happened here yet.')).toBeInTheDocument();
  });

  it('isn’t there for people who aren’t admins', async () => {
    accounts.signInAs('johan.vandermerwe@example.com');
    const { router } = renderApp('/audit');
    await screen.findByRole('heading', { level: 1, name: 'Thandi Nkosi' });
    expect(router.state.location.pathname).toBe('/');
    expect(screen.queryByRole('link', { name: 'Audit' })).not.toBeInTheDocument();
  });

  it('only shows an admin their own part of the organisation', async () => {
    // thandi changes ayesha, beside sipho, then sipho looks
    const router = await editRole(SEED_IDS.cfo, 'Finance Director');
    accounts.signInAs('sipho.dlamini@example.com');
    await router.navigate('/audit');
    await screen.findByRole('heading', { name: 'Audit' });
    expect(screen.queryByText('Thandi Nkosi changed Ayesha Patel')).not.toBeInTheDocument();
  });

  it('is accessible', async () => {
    const router = await editRole(SEED_IDS.seniorEngineer, 'Lead Engineer');
    await router.navigate('/audit');
    await screen.findAllByText('Thandi Nkosi changed Ruan Botha');
    await expectNoA11yProblems();
  });
});
