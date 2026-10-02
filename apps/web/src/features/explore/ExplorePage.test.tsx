import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SEED_IDS } from '../../mocks/seed';
import { renderApp } from '../../test/renderApp';

// handy finders for the main areas of the page
const orbit = () => screen.getByRole('region', { name: /^Orbit around/ });
const path = () => screen.getByRole('complementary', { name: 'Path to the top' });
const details = () => screen.getByRole('complementary', { name: 'Details' });
const heading = () => screen.findByRole('heading', { level: 1 });

describe('Explore page', () => {
  it('starts at the top of the org with their team around them', async () => {
    renderApp('/');
    expect(await heading()).toHaveTextContent('Thandi Nkosi');
    // three direct reports and no manager card for the ceo
    const cards = within(orbit()).getAllByRole('button');
    expect(cards.map((b) => b.textContent)).toEqual([
      expect.stringContaining('Sipho Dlamini'),
      expect.stringContaining('Lerato Mokoena'),
      expect.stringContaining('Ayesha Patel'),
    ]);
    expect(within(orbit()).queryByText('Reports to')).not.toBeInTheDocument();
  });

  it('moves to a person when you click them and puts them in the url', async () => {
    const { router } = renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: /Sipho Dlamini/ }));

    expect(await heading()).toHaveTextContent('Sipho Dlamini');
    expect(router.state.location.search).toContain(`person=${SEED_IDS.cto}`);
    expect(within(orbit()).getByText('Reports to')).toBeInTheDocument();
    // keyboard focus lands on the new centre card instead of getting lost
    expect(document.activeElement).toHaveAccessibleName('Sipho Dlamini, Chief Technology Officer');
  });

  it('shows the path to the top and lets you jump back up', async () => {
    renderApp(`/?person=${SEED_IDS.seniorEngineer}`);
    expect(await heading()).toHaveTextContent('Ruan Botha');

    const stops = within(path()).getAllByRole('button');
    expect(stops.map((b) => b.textContent)).toEqual([
      expect.stringContaining('Thandi'),
      expect.stringContaining('Sipho'),
      expect.stringContaining('Johan'),
      expect.stringContaining('Ruan'),
    ]);
    expect(stops[3]).toHaveAttribute('aria-current', 'step');

    await userEvent.click(stops[1] as HTMLElement);
    expect(await heading()).toHaveTextContent('Sipho Dlamini');
  });

  it('says so when someone has no team', async () => {
    renderApp(`/?person=${SEED_IDS.seniorEngineer}`);
    expect(await screen.findByText('Nobody reports to Ruan yet.')).toBeInTheDocument();
  });

  it('shows the details and stats for the selected person', async () => {
    renderApp(`/?person=${SEED_IDS.engineeringManager}`);
    await heading();
    const panel = details();
    const stats = within(panel).getAllByRole('listitem');
    expect(stats[0]).toHaveTextContent('4Direct reports');
    expect(stats[1]).toHaveTextContent('4Whole team');
    expect(stats[2]).toHaveTextContent('2Levels from top');
    expect(within(panel).getByText('EMP-0005')).toBeInTheDocument();
    expect(within(panel).getByText('R 98 000')).toBeInTheDocument();
    expect(within(panel).getByText(/4 people will move to Sipho Dlamini/)).toBeInTheDocument();
  });

  it('lets you jump to a colleague from works alongside', async () => {
    renderApp(`/?person=${SEED_IDS.engineeringManager}`);
    await heading();
    await userEvent.click(within(details()).getByRole('button', { name: /Naledi Khumalo/ }));
    expect(await heading()).toHaveTextContent('Naledi Khumalo');
  });

  it('switches to levels and back, keeping the same person', async () => {
    const { router } = renderApp(`/?person=${SEED_IDS.engineeringManager}`);
    await heading();

    await userEvent.click(screen.getByRole('button', { name: 'Levels view' }));
    expect(router.state.location.search).toContain('view=levels');
    const levels = screen.getByRole('region', { name: 'Levels view' });
    // top level, then the teams of thandi, sipho and johan
    expect(
      within(levels)
        .getAllByRole('heading', { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(['Top level', 'Reports to Thandi', 'Reports to Sipho', 'Reports to Johan']);
    expect(within(levels).getByRole('button', { current: true })).toHaveTextContent(
      'Johan van der Merwe',
    );

    await userEvent.click(within(levels).getByRole('button', { name: /Priya Naidoo/ }));
    expect(await heading()).toHaveTextContent('Priya Naidoo');

    await userEvent.click(screen.getByRole('button', { name: 'Orbit view' }));
    expect(router.state.location.search).not.toContain('view=');
    expect(orbit()).toBeInTheDocument();
  });

  it('falls back to the top when the url points at someone who is gone', async () => {
    renderApp('/?person=00000000-0000-4000-8000-999999999999');
    expect(await heading()).toHaveTextContent('Thandi Nkosi');
    expect(screen.getByRole('status')).toHaveTextContent("We couldn't find that person");
  });

  it('supports the back button', async () => {
    const { router } = renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: /Sipho Dlamini/ }));
    expect(await heading()).toHaveTextContent('Sipho Dlamini');
    await act(() => router.navigate(-1));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Thandi Nkosi'),
    );
  });
});
