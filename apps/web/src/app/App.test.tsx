import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';

describe('App', () => {
  it('opens on Explore with the top of the organisation', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Thandi Nkosi');
    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('aria-current', 'page');
  });

  it('moves to the People page from the navigation', async () => {
    renderApp('/');
    await userEvent.click(await screen.findByRole('link', { name: 'People' }));
    expect(await screen.findByText('Showing 1 to 10 of 14 people')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getByRole('link', { name: 'People' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows a not found page for unknown URLs', async () => {
    renderApp('/nowhere');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
