import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SEED_IDS } from '../../mocks/seed';
import { expectNoA11yProblems } from '../../test/a11y';
import { renderApp } from '../../test/renderApp';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const details = () => screen.getByRole('complementary', { name: /details/i });
const slider = () => screen.getByRole('slider', { name: 'Moment in time' });

describe('time travel', () => {
  it('shows the organisation as it was, from a link', async () => {
    renderApp(`/?person=${SEED_IDS.seniorEngineer}&at=${daysAgo(30)}`);
    expect(
      await screen.findByText(/You.re looking at the organisation as it was on/),
    ).toBeInTheDocument();
    expect(within(details()).getByText('Naledi Khumalo')).toBeInTheDocument();
  });

  it('brings back someone who has since left, with their team', async () => {
    renderApp(`/?person=${id(12)}&at=${daysAgo(25)}`);
    await screen.findByText(/as it was on/);
    expect(screen.getByRole('complementary', { name: 'Path to the top' })).toHaveTextContent(
      'Pieter Vosloo',
    );
  });

  it('switches editing off in the past, and back on today', async () => {
    renderApp(`/?person=${SEED_IDS.seniorEngineer}&at=${daysAgo(30)}`);
    await screen.findByText(/as it was on/);
    expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Back to today' }));
    expect(await screen.findByRole('button', { name: 'Edit details' })).toBeInTheDocument();
    expect(screen.queryByText(/as it was on/)).not.toBeInTheDocument();
  });

  it('moves through time with the slider and says what changed', async () => {
    const { router } = renderApp(`/?person=${SEED_IDS.ceo}`);
    await screen.findByRole('heading', { level: 1 });
    expect(await screen.findByText('Today')).toBeInTheDocument();

    fireEvent.change(slider(), { target: { value: '0' } });
    expect(await screen.findByText(/^Before /)).toBeInTheDocument();
    expect(router.state.location.search).toMatch(/at=/);

    fireEvent.change(slider(), { target: { value: '3' } });
    expect(
      await screen.findByText("Ruan Botha moved to Johan van der Merwe's team"),
    ).toBeInTheDocument();
  });

  it('plays the history forward on its own', async () => {
    renderApp(`/?person=${SEED_IDS.ceo}`);
    await screen.findByText('Today');
    await userEvent.click(screen.getByRole('button', { name: 'Play history' }));
    expect(
      await screen.findByText('Megan Fourie joined', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
  });

  it('quietly shows the top when someone wasn’t here yet', async () => {
    renderApp(`/?person=${SEED_IDS.ceo.replace(/1$/, '9')}&at=${daysAgo(30)}`);
    await screen.findByText(/as it was on/);
    expect(screen.queryByText(/couldn't find that person/)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Thandi Nkosi'),
    );
  });

  it('is accessible', async () => {
    renderApp(`/?person=${SEED_IDS.seniorEngineer}&at=${daysAgo(30)}`);
    await screen.findByText(/as it was on/);
    await expectNoA11yProblems();
  });
});
