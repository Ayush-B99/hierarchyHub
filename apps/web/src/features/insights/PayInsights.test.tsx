import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { accounts } from '../../mocks/accounts';
import { SEED_IDS } from '../../mocks/seed';
import { expectNoA11yProblems } from '../../test/a11y';
import { renderApp } from '../../test/renderApp';

const open = async (person: string) => {
  renderApp(`/?person=${person}`);
  await screen.findByRole('heading', { level: 1 });
};

describe('pay check', () => {
  it('flags someone paid well above what their position usually earns', async () => {
    await open(SEED_IDS.seniorEngineer);
    const note = await screen.findByRole('complementary', { name: 'Pay check' });
    expect(note).toHaveTextContent(/Earns \d+% more than people in a similar position/);
    expect(note).toHaveTextContent(/Learned from the 14 salaries you can see/);
  });

  it('flags someone paid well below it', async () => {
    await open(SEED_IDS.engineeringManager);
    expect(await screen.findByRole('complementary', { name: 'Pay check' })).toHaveTextContent(
      /\d+% less than/,
    );
  });

  it('says nothing about people paid about what you would expect', async () => {
    await open(SEED_IDS.cto);
    expect(screen.queryByRole('complementary', { name: 'Pay check' })).not.toBeInTheDocument();
  });

  it('shows nothing to someone who can only see their own salary', async () => {
    accounts.signInAs('ruan.botha@example.com');
    await open(SEED_IDS.seniorEngineer);
    expect(screen.queryByRole('complementary', { name: 'Pay check' })).not.toBeInTheDocument();
  });

  it('tags flagged salaries on the people page', async () => {
    renderApp('/people?sort=salary&dir=desc&pageSize=50');
    const ruan = (await screen.findByText('Ruan Botha')).closest('tr')!;
    expect(
      within(ruan).getByTitle(/above what a similar position usually earns/),
    ).toHaveTextContent(/^\+\d+%$/);
  });

  it('suggests a salary range when adding someone', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await userEvent.click(screen.getByRole('button', { name: 'Add employee' }));
    const salary = await screen.findByLabelText('Salary (R)');
    expect(salary).toHaveAccessibleDescription(
      /Similar positions here usually earn R [\d ]+ to R [\d ]+/,
    );
  });

  it('is accessible', async () => {
    await open(SEED_IDS.seniorEngineer);
    await screen.findByRole('complementary', { name: 'Pay check' });
    await expectNoA11yProblems();
  });
});
