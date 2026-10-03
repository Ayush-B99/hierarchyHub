import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SEED_IDS } from '../../mocks/seed';
import { renderApp } from '../../test/renderApp';

const dialog = () => screen.getByRole('dialog');
const heading = () => screen.findByRole('heading', { level: 1 });
const toasts = () => screen.getByRole('region', { name: 'Notifications' });

async function fill(label: string | RegExp, value: string) {
  const input = within(dialog()).getByLabelText(label);
  await userEvent.clear(input);
  await userEvent.type(input, value);
}

describe('adding an employee', () => {
  it('points out every missing field and jumps to the first one', async () => {
    renderApp('/');
    await heading();
    await userEvent.click(screen.getByRole('button', { name: 'Add employee' }));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Add employee' }));

    expect(within(dialog()).getByText('Enter a first name')).toBeInTheDocument();
    expect(within(dialog()).getByText('Enter a salary')).toBeInTheDocument();
    expect(within(dialog()).getByLabelText('First name')).toHaveFocus();
    expect(within(dialog()).getByLabelText('First name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('adds someone and takes you to them', async () => {
    const { router } = renderApp('/');
    await heading();
    await userEvent.click(screen.getByRole('button', { name: 'Add employee' }));

    await fill('First name', 'Lindiwe');
    await fill('Surname', 'Mahlangu');
    await fill('Email', 'lindiwe.mahlangu@example.com');
    await fill('Employee number', 'EMP-0100');
    await fill('Birth date', '1994-03-02');
    await fill('Role', 'Data Analyst');
    await fill('Salary (R)', '61000');
    await userEvent.selectOptions(within(dialog()).getByLabelText('Reports to'), SEED_IDS.cto);
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Add employee' }));

    expect(await within(toasts()).findByText('Added Lindiwe Mahlangu')).toBeInTheDocument();
    await waitFor(async () => expect(await heading()).toHaveTextContent('Lindiwe Mahlangu'));
    expect(router.state.location.search).toContain('person=');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows what the server says about a duplicate', async () => {
    renderApp('/');
    await heading();
    await userEvent.click(screen.getByRole('button', { name: 'Add employee' }));
    await fill('First name', 'Copy');
    await fill('Surname', 'Cat');
    await fill('Email', 'thandi.nkosi@example.com');
    await fill('Employee number', 'EMP-0999');
    await fill('Birth date', '1990-01-01');
    await fill('Role', 'Tester');
    await fill('Salary (R)', '1000');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Add employee' }));

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent(/already has that email/);
  });

  it('closes with cancel and keeps nothing', async () => {
    renderApp('/');
    await heading();
    await userEvent.click(screen.getByRole('button', { name: 'Add employee' }));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('editing an employee', () => {
  it('saves changed details', async () => {
    renderApp(`/?person=${SEED_IDS.engineeringManager}`);
    await heading();
    await userEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(within(dialog()).getByLabelText('First name')).toHaveValue('Johan');

    await fill('Role', 'Head of Engineering');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save changes' }));

    expect(await within(toasts()).findByText("Saved Johan's changes")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Selected person' })).toHaveTextContent(
        'Head of Engineering',
      ),
    );
  });

  it('greys out the person and their team when changing manager', async () => {
    renderApp(`/?person=${SEED_IDS.cto}`);
    await heading();
    await userEvent.click(screen.getByRole('button', { name: 'Change manager' }));

    const picker = within(dialog()).getByLabelText('Reports to');
    expect(picker).toHaveFocus();
    const option = (name: RegExp) =>
      within(picker).getByRole('option', { name }) as HTMLOptionElement;
    expect(option(/^Sipho Dlamini/).disabled).toBe(true);
    expect(option(/^Johan van der Merwe/).disabled).toBe(true);
    expect(option(/^Ruan Botha/).disabled).toBe(true);
    expect(option(/^Ayesha Patel/).disabled).toBe(false);
    expect(option(/^Ruan Botha/)).toHaveTextContent('(in their team)');
  });

  it('moves someone to a new manager', async () => {
    renderApp(`/?person=${SEED_IDS.engineeringManager}`);
    await heading();
    await userEvent.click(screen.getByRole('button', { name: 'Change manager' }));
    await userEvent.selectOptions(within(dialog()).getByLabelText('Reports to'), SEED_IDS.ceo);
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(
        within(screen.getByRole('complementary', { name: 'Path to the top' })).getAllByRole(
          'button',
        ),
      ).toHaveLength(2),
    );
  });

  it('closes when you press escape', async () => {
    renderApp(`/?person=${SEED_IDS.cto}`);
    await heading();
    await userEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    dialog().dispatchEvent(new Event('cancel', { cancelable: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('deleting an employee', () => {
  it('says who moves where, then deletes and shows their old team', async () => {
    renderApp(`/?person=${SEED_IDS.engineeringManager}`);
    await heading();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(dialog()).toHaveAccessibleName('Delete Johan van der Merwe?');
    expect(dialog()).toHaveAccessibleDescription(
      /4 people report to Johan. They'll move to Sipho Dlamini/,
    );
    // cancel is focused first so a stray enter key can't delete anyone
    expect(within(dialog()).getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete employee' }));

    expect(await within(toasts()).findByText('Deleted Johan van der Merwe')).toBeInTheDocument();
    await waitFor(async () => expect(await heading()).toHaveTextContent('Sipho Dlamini'));
    // johan's four people now sit under sipho
    await waitFor(() =>
      expect(
        within(screen.getByRole('region', { name: /^Orbit around/ })).getByRole('button', {
          name: /Ruan Botha/,
        }),
      ).toBeInTheDocument(),
    );
  });
});
