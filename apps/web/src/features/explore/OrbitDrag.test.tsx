import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SEED_IDS } from '../../mocks/seed';
import { renderApp } from '../../test/renderApp';

const orbit = () => screen.getByRole('region', { name: /^Orbit around/ });
const card = (name: RegExp) => within(orbit()).getByRole('button', { name });

/** jsdom has no layout, so tell it which card is under the pointer */
function pointerIsOver(element: Element) {
  document.elementFromPoint = vi.fn(() => element);
}

/** press on one card, move far enough to start a drag, then let go */
function dragFromTo(from: Element, to: Element) {
  fireEvent.pointerDown(from, { pointerType: 'mouse', button: 0, clientX: 100, clientY: 100 });
  pointerIsOver(to);
  fireEvent.pointerMove(window, { clientX: 140, clientY: 160 });
  fireEvent.pointerUp(window, { clientX: 140, clientY: 160 });
}

describe('drag to change manager', () => {
  afterEach(() => {
    // @ts-expect-error put jsdom back how it was
    delete document.elementFromPoint;
  });

  it('asks first, then moves someone onto a new manager', async () => {
    renderApp(`/?person=${SEED_IDS.cto}`);
    await screen.findByRole('heading', { level: 1 });

    // sipho's team: johan and naledi. drag naledi onto johan
    dragFromTo(card(/Naledi Khumalo/), card(/Johan van der Merwe/));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('Move Naledi Khumalo?');
    expect(dialog).toHaveAccessibleDescription(
      'Naledi will report to Johan van der Merwe instead of Sipho Dlamini.',
    );

    await userEvent.click(within(dialog).getByRole('button', { name: 'Move' }));
    expect(
      await screen.findByText('Naledi now reports to Johan van der Merwe'),
    ).toBeInTheDocument();
    // naledi is no longer one of sipho's direct reports
    await waitFor(() =>
      expect(
        within(orbit()).queryByRole('button', { name: /Naledi Khumalo/ }),
      ).not.toBeInTheDocument(),
    );
  });

  it("won't drop someone onto a person below them", async () => {
    renderApp(`/?person=${SEED_IDS.cto}`);
    await screen.findByRole('heading', { level: 1 });
    // dragging the manager (thandi) onto sipho would make a loop, so nothing happens
    dragFromTo(card(/Thandi Nkosi/), card(/Johan van der Merwe/));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does nothing when cancelled', async () => {
    renderApp(`/?person=${SEED_IDS.cto}`);
    await screen.findByRole('heading', { level: 1 });
    dragFromTo(card(/Naledi Khumalo/), card(/Johan van der Merwe/));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }),
    );
    expect(card(/Naledi Khumalo/)).toBeInTheDocument();
  });

  it('a normal click still just opens the person', async () => {
    renderApp(`/?person=${SEED_IDS.cto}`);
    await screen.findByRole('heading', { level: 1 });
    await userEvent.click(card(/Naledi Khumalo/));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Naledi Khumalo');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
