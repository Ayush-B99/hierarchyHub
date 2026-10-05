import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { accounts } from '../../mocks/accounts';
import { db } from '../../mocks/db';
import { SEED_IDS } from '../../mocks/seed';
import { renderApp } from '../../test/renderApp';

const open = async (person: string) => {
  renderApp(`/?person=${person}`);
  return screen.findByRole('heading', { level: 1 });
};
const details = () => screen.getByRole('complementary', { name: /details/i });

describe('what ruan, with no team, can do', () => {
  it('edits his own name and email, and nothing else', async () => {
    accounts.signInAs('ruan.botha@example.com');
    await open(SEED_IDS.seniorEngineer);
    expect(screen.queryByRole('button', { name: 'Change manager' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('First name')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Email')).toBeInTheDocument();
    for (const label of ['Salary', 'Role', 'Reports to', 'Birth date', 'Employee number']) {
      expect(within(dialog).queryByLabelText(label)).not.toBeInTheDocument();
    }

    await userEvent.clear(within(dialog).getByLabelText('First name'));
    await userEvent.type(within(dialog).getByLabelText('First name'), 'Ruan-Pierre');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ruan-Pierre Botha' }),
    ).toBeInTheDocument();
    expect(db.find(SEED_IDS.seniorEngineer)?.salary).toBe(76000);
  });

  it('sees his own salary', async () => {
    accounts.signInAs('ruan.botha@example.com');
    await open(SEED_IDS.seniorEngineer);
    expect(within(details()).getByText('R 76 000')).toBeInTheDocument();
  });

  it('doesn’t see his manager’s salary or birth date, or get to change him', async () => {
    accounts.signInAs('ruan.botha@example.com');
    await open(SEED_IDS.engineeringManager);
    expect(within(details()).getAllByText('Private')).toHaveLength(2);
    // and he can't change his manager at all
    expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();
  });

  it('sees only his own salary on the people page, and is told why filters leave people out', async () => {
    accounts.signInAs('ruan.botha@example.com');
    renderApp('/people?sort=salary&dir=desc');
    expect(await screen.findByRole('note')).toHaveTextContent(
      /only include you and the people below you/,
    );
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Ruan Botha');
  });
});

describe('what johan, a manager who isn’t an admin, can do', () => {
  it('changes and moves his team, but can’t delete or add people', async () => {
    accounts.signInAs('johan.vandermerwe@example.com');
    await open(SEED_IDS.seniorEngineer);
    expect(screen.getByRole('button', { name: 'Edit details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change manager' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add employee' })).not.toBeInTheDocument();
    expect(within(details()).getByText('R 76 000')).toBeInTheDocument();
  });

  it('can only choose himself or his team as someone’s manager', async () => {
    accounts.signInAs('johan.vandermerwe@example.com');
    await open(SEED_IDS.seniorEngineer);
    await userEvent.click(screen.getByRole('button', { name: 'Change manager' }));
    const options = within(await screen.findByLabelText('Reports to'))
      .getAllByRole('option')
      .map((o) => o.textContent ?? '');
    expect(options.some((o) => o.startsWith('Johan van der Merwe'))).toBe(true);
    expect(options.some((o) => o.startsWith('Zanele Mthembu'))).toBe(true);
    for (const outOfReach of ['Sipho Dlamini', 'Thandi Nkosi', 'Naledi Khumalo', 'No manager']) {
      expect(options.some((o) => o.startsWith(outOfReach))).toBe(false);
    }
  });

  it('can’t change his own boss', async () => {
    accounts.signInAs('johan.vandermerwe@example.com');
    await open(SEED_IDS.cto);
    expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();
    expect(within(details()).getAllByText('Private')).toHaveLength(2);
  });
});

describe('what sipho, an admin, can do with accounts', () => {
  it('makes someone in his team an admin, but has no buttons for his own account', async () => {
    accounts.signInAs('sipho.dlamini@example.com');
    renderApp('/accounts');
    const table = await screen.findByRole('table');
    const own = within(table).getByText('Sipho Dlamini').closest('tr')!;
    expect(within(own).queryByRole('button')).not.toBeInTheDocument();

    const johan = within(table).getByText('Johan van der Merwe').closest('tr')!;
    await userEvent.click(within(johan).getByRole('button', { name: /Make admin/ }));
    expect(await screen.findByText('Johan van der Merwe is now an admin')).toBeInTheDocument();
    expect(accounts.byEmail('johan.vandermerwe@example.com')?.isAdmin).toBe(true);
  });

  it('turns an account off', async () => {
    accounts.signInAs('sipho.dlamini@example.com');
    renderApp('/accounts');
    const johan = (await screen.findByText('Johan van der Merwe')).closest('tr')!;
    await userEvent.click(within(johan).getByRole('button', { name: /Turn off/ }));
    expect(
      await screen.findByText("Johan van der Merwe's account is turned off"),
    ).toBeInTheDocument();
    expect(accounts.byEmail('johan.vandermerwe@example.com')?.status).toBe('disabled');
  });
});
