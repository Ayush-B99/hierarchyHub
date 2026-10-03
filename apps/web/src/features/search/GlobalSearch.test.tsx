import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const box = () => screen.getByRole('combobox', { name: 'Find someone' });

describe('search in the top bar', () => {
  it('finds people as you type and opens the one you pick', async () => {
    const { router } = renderApp('/people');
    await screen.findByRole('table');

    await userEvent.type(box(), 'naid');
    const list = screen.getByRole('listbox', { name: 'Matching people' });
    expect(within(list).getAllByRole('option')).toHaveLength(1);
    expect(box()).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(within(list).getByRole('option', { name: /Priya Naidoo/ }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Priya Naidoo');
    expect(router.state.location.pathname).toBe('/');
    expect(box()).toHaveValue('');
  });

  it('works with the arrow keys and enter', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await userEvent.type(box(), 'software');
    // two software engineers, first one is highlighted
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(box()).toHaveAttribute('aria-activedescendant', options[0]?.id);

    await userEvent.keyboard('{ArrowDown}');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      options[1]?.textContent?.includes('Zanele') ? 'Zanele Mthembu' : 'Kagiso Molefe',
    );
  });

  it('jumps to the search box when you press /', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await userEvent.keyboard('/');
    expect(box()).toHaveFocus();
  });

  it('says when nobody matches, and escape clears it', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await userEvent.type(box(), 'zzzz');
    expect(screen.getByText('Nobody matches "zzzz".')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(box()).toHaveValue('');
  });
});
