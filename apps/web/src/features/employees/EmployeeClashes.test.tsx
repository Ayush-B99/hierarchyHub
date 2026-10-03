import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../mocks/db';
import { SEED_IDS } from '../../mocks/seed';
import { renderApp } from '../../test/renderApp';

// each test opens a dialog, then a colleague saves in the background before we confirm.
// the api refuses our change (412) and the app has to handle it kindly, never overwriting theirs

const dialog = () => screen.getByRole('dialog');
const heading = () => screen.findByRole('heading', { level: 1 });

/** a colleague saving a change behind our back, which bumps the version */
const colleagueChanges = (id: string, patch: Parameters<typeof db.update>[1]) =>
  db.update(id, patch);

describe('when someone else saved first', () => {
  afterEach(() => {
    // @ts-expect-error put jsdom back how it was
    delete document.elementFromPoint;
  });

  it('editing: explains, keeps their change, and loads the latest to edit from', async () => {
    renderApp(`/?person=${SEED_IDS.engineeringManager}`);
    await heading();
    await userEvent.click(screen.getByRole('button', { name: 'Edit details' }));

    colleagueChanges(SEED_IDS.engineeringManager, { role: 'Head of Engineering' });

    const role = within(dialog()).getByLabelText('Role');
    await userEvent.clear(role);
    await userEvent.type(role, 'My change');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save changes' }));

    expect(
      await within(dialog()).findByText(/Someone else changed Johan while you were editing/),
    ).toBeInTheDocument();
    // their change is still there, ours didn't overwrite it
    expect(db.find(SEED_IDS.engineeringManager)?.role).toBe('Head of Engineering');

    await userEvent.click(
      within(dialog()).getByRole('button', { name: 'Load the latest version' }),
    );
    await waitFor(() =>
      expect(within(dialog()).getByLabelText('Role')).toHaveValue('Head of Engineering'),
    );

    // now editing from the latest version, saving works
    await userEvent.clear(within(dialog()).getByLabelText('Role'));
    await userEvent.type(within(dialog()).getByLabelText('Role'), 'My change');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(db.find(SEED_IDS.engineeringManager)?.role).toBe('My change');
  });

  it('editing: says so if they were deleted meanwhile', async () => {
    renderApp(`/?person=${SEED_IDS.seniorEngineer}`);
    await heading();
    await userEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    colleagueChanges(SEED_IDS.seniorEngineer, { role: 'Changed' });
    await userEvent.type(within(dialog()).getByLabelText('Role'), ' too');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save changes' }));
    await within(dialog()).findByRole('button', { name: 'Load the latest version' });

    db.remove(SEED_IDS.seniorEngineer);
    await userEvent.click(
      within(dialog()).getByRole('button', { name: 'Load the latest version' }),
    );
    expect(
      await within(dialog()).findByText('Someone else has deleted this employee.'),
    ).toBeInTheDocument();
  });

  it('deleting: refuses to delete blind and keeps them', async () => {
    renderApp(`/?person=${SEED_IDS.seniorEngineer}`);
    await heading();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    colleagueChanges(SEED_IDS.seniorEngineer, { role: 'Promoted' });

    await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete employee' }));

    expect(await within(dialog()).findByText(/so nothing was deleted/)).toBeInTheDocument();
    expect(within(dialog()).getByRole('button', { name: 'Delete employee' })).toBeDisabled();
    expect(db.find(SEED_IDS.seniorEngineer)).toBeDefined();
  });

  it('dragging: refuses the move and says why', async () => {
    renderApp(`/?person=${SEED_IDS.cto}`);
    await heading();
    const orbit = screen.getByRole('region', { name: /^Orbit around/ });
    const naledi = within(orbit).getByRole('button', { name: /Naledi Khumalo/ });
    const johan = within(orbit).getByRole('button', { name: /Johan van der Merwe/ });

    fireEvent.pointerDown(naledi, { pointerType: 'mouse', button: 0, clientX: 100, clientY: 100 });
    document.elementFromPoint = vi.fn(() => johan);
    fireEvent.pointerMove(window, { clientX: 140, clientY: 160 });
    fireEvent.pointerUp(window, { clientX: 140, clientY: 160 });
    await screen.findByRole('dialog');

    colleagueChanges('00000000-0000-4000-8000-000000000006', { role: 'Changed' });
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Move' }));

    expect(await within(dialog()).findByText(/so they weren't moved/)).toBeInTheDocument();
    expect(db.find('00000000-0000-4000-8000-000000000006')?.managerId).toBe(SEED_IDS.cto);
  });
});
