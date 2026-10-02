import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';

describe('App', () => {
  it('shows the top of the organisation and their direct reports on Explore', async () => {
    renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Thandi Nkosi' }),
    ).toBeInTheDocument();
    const reports = screen.getByRole('region', { name: 'Reports to Thandi' });
    expect(within(reports).getAllByRole('article')).toHaveLength(3);
  });

  it('moves to the People page from the navigation', async () => {
    renderApp('/');
    await userEvent.click(screen.getByRole('link', { name: 'People' }));
    expect(await screen.findByText('14 people')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(15);
    expect(screen.getByRole('link', { name: 'People' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows a not found page for unknown URLs', async () => {
    renderApp('/nowhere');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
