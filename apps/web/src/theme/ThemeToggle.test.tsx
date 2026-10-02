import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';

describe('theme toggle', () => {
  it('switches between light and dark and remembers the choice', async () => {
    renderApp('/');
    const toggle = await screen.findByRole('button', { name: 'Switch to dark mode' });
    expect(document.documentElement.dataset.theme).toBe('light');

    await userEvent.click(toggle);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('hierarchy-hub-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });
});
