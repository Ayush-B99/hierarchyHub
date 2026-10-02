import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SEED_IDS } from '../../mocks/seed';
import { renderApp } from '../../test/renderApp';

// handy helpers for reading the table
const table = () => screen.getByRole('table');
const names = () =>
  within(table())
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getByRole('link').querySelector('strong')?.textContent);
const summary = () => screen.getByRole('status');
const waitForRows = async (count: number) =>
  waitFor(() => expect(within(table()).getAllByRole('row')).toHaveLength(count + 1));

describe('People page', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the first page sorted by surname, then the next page', async () => {
    renderApp('/people');
    await waitForRows(10);
    expect(summary()).toHaveTextContent('Showing 1 to 10 of 14 people');
    expect(names()[0]).toBe('Fatima Adams');

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitForRows(4);
    expect(summary()).toHaveTextContent('Showing 11 to 14 of 14 people');
  });

  it('sorts by a column, and again the other way', async () => {
    const { router } = renderApp('/people');
    await waitForRows(10);

    await userEvent.click(screen.getByRole('button', { name: /Salary/ }));
    await waitFor(() => expect(names()[0]).toBe('Bongani Zulu'));
    expect(screen.getByRole('columnheader', { name: /Salary/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    await userEvent.click(screen.getByRole('button', { name: /Salary/ }));
    await waitFor(() => expect(names()[0]).toBe('Thandi Nkosi'));
    expect(router.state.location.search).toContain('sort=salary');
    expect(router.state.location.search).toContain('dir=desc');
  });

  it('sorts by manager', async () => {
    renderApp('/people');
    await waitForRows(10);
    await userEvent.click(screen.getByRole('button', { name: /Reports to/ }));
    // thandi has no manager so she comes first
    await waitFor(() => expect(names()[0]).toBe('Thandi Nkosi'));
  });

  it('filters with the sentence', async () => {
    const { router } = renderApp('/people');
    await waitForRows(10);

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Role' }),
      'Software Engineer',
    );
    await waitForRows(2);
    expect(router.state.location.search).toContain('role=Software+Engineer');

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Role' }), 'any');
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Manager' }),
      SEED_IDS.engineeringManager,
    );
    await waitForRows(4);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Manager' }), 'anyone');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Salary' }), 'over-100k');
    await waitForRows(5);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Salary' }), 'any');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Birth date' }), '1990s');
    await waitForRows(8);
  });

  it('searches by name, email or employee number', async () => {
    renderApp('/people');
    await waitForRows(10);
    await userEvent.type(screen.getByRole('searchbox', { name: /Search/ }), 'naidoo');
    await waitForRows(1);
    expect(names()).toEqual(['Priya Naidoo']);

    await userEvent.clear(screen.getByRole('searchbox', { name: /Search/ }));
    await userEvent.type(screen.getByRole('searchbox', { name: /Search/ }), 'EMP-0012');
    await waitFor(() => expect(names()).toEqual(['Thabo Sithole']));
  });

  it('opens a filtered view straight from a shared link', async () => {
    renderApp(`/people?manager=${SEED_IDS.engineeringManager}&sort=salary&dir=desc`);
    await waitForRows(4);
    expect(names()[0]).toBe('Ruan Botha');
    expect(screen.getByRole('combobox', { name: 'Manager' })).toHaveValue(
      SEED_IDS.engineeringManager,
    );
  });

  it('shows a friendly message when nothing matches and lets you clear it', async () => {
    renderApp('/people?role=Accountant&pay=over-100k');
    expect(await screen.findByText(/Nobody matches that/)).toBeInTheDocument();
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Clear filters' })[0] as HTMLElement,
    );
    await waitForRows(10);
  });

  it('opens a person in Explore when you click their name', async () => {
    const { router } = renderApp('/people');
    await waitForRows(10);
    await userEvent.click(screen.getByRole('link', { name: /Priya Naidoo/ }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Priya Naidoo');
    expect(router.state.location.pathname).toBe('/');
  });

  it('exports every matching person to csv, not just this page', async () => {
    const createUrl = vi.fn((blob: Blob) => {
      void blob;
      return 'blob:test';
    });
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() }),
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderApp('/people');
    await waitForRows(10);
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    const blob = createUrl.mock.calls[0]?.[0] as Blob;
    // jsdom's blob has no .text(), so read it the old-fashioned way
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    // header plus all 14 people, even though only 10 are on screen
    expect(text.trim().split('\r\n')).toHaveLength(15);
  });
});
