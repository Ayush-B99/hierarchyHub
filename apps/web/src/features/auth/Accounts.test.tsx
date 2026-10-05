import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { accounts, MOCK_PASSWORD } from '../../mocks/accounts';
import { server } from '../../mocks/node';
import { SEED_IDS } from '../../mocks/seed';
import { expectNoA11yProblems } from '../../test/a11y';
import { renderApp } from '../../test/renderApp';
import { safeNext } from './safeNext';

const signInWith = async (email: string, password: string) => {
  await userEvent.type(await screen.findByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
};

describe('signing in', () => {
  it('sends you to sign in first, then back to where you were going', async () => {
    accounts.signInAs(null);
    const { router } = renderApp('/people');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?next=%2Fpeople');

    await signInWith('ruan.botha@example.com', MOCK_PASSWORD);
    expect(await screen.findByText('Showing 1 to 10 of 14 people')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/people');
    // the top bar says who is signed in
    expect(screen.getByTitle('ruan.botha@example.com')).toHaveTextContent('Ruan Botha');
  });

  it('stays signed in when the first "who is signed in" check answers late', async () => {
    // on a slow connection you can sign in before the app's first check comes back. that old
    // answer says nobody is signed in, and mustn't undo the sign in that happened since
    accounts.signInAs(null);
    server.use(
      http.get('*/api/auth/me', async () => {
        await delay(400);
        return HttpResponse.json({ statusCode: 401, message: 'Please sign in.' }, { status: 401 });
      }),
    );
    const { router } = renderApp('/signin');
    await signInWith('ruan.botha@example.com', MOCK_PASSWORD);
    await screen.findByTitle('ruan.botha@example.com');
    // wait past the slow answer
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByTitle('ruan.botha@example.com')).toBeInTheDocument();
  });

  it('says so when the password is wrong, without signing in', async () => {
    accounts.signInAs(null);
    renderApp('/');
    await signInWith('ruan.botha@example.com', 'not the password');
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is wrong.');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('tells someone who signed up that they’re still waiting', async () => {
    accounts.signInAs(null);
    renderApp('/');
    await signInWith('amara.okafor@example.com', MOCK_PASSWORD);
    expect(await screen.findByRole('alert')).toHaveTextContent(/waiting for an admin/);
  });

  it('only ever goes on to a page inside the app', () => {
    expect(safeNext('/people?sort=salary')).toBe('/people?sort=salary');
    for (const unsafe of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      null,
    ]) {
      expect(safeNext(unsafe)).toBe('/');
    }
  });
});

describe('signing out', () => {
  it('goes back to sign in and forgets everything it loaded', async () => {
    const { router } = renderApp('/people');
    await screen.findByText('Showing 1 to 10 of 14 people');
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

    // going back doesn't show the old page from memory
    await router.navigate('/people');
    await waitFor(() => expect(router.state.location.pathname).toBe('/signin'));
    expect(router.state.location.search).toBe('?next=%2Fpeople');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('happens by itself when the api says the session has ended', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Thandi Nkosi' });
    accounts.signInAs(null);
    server.use(
      http.get('*/api/employees', () =>
        HttpResponse.json({ statusCode: 401, message: 'Please sign in.' }, { status: 401 }),
      ),
    );
    await userEvent.click(screen.getByRole('link', { name: 'People' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});

describe('signing up', () => {
  it('points out what to fix, starting with the first thing', async () => {
    accounts.signInAs(null);
    renderApp('/signup');
    await userEvent.click(await screen.findByRole('button', { name: 'Ask for an account' }));
    expect(screen.getByLabelText('Full name')).toHaveFocus();
    expect(screen.getByLabelText('Full name')).toHaveAccessibleDescription('Required');

    await userEvent.type(screen.getByLabelText('Full name'), 'Lerato M');
    await userEvent.type(screen.getByLabelText('Work email'), 'lerato@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Ask for an account' }));
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Use at least 12 characters',
    );
  });

  it('thanks you and explains an admin will approve it', async () => {
    accounts.signInAs(null);
    renderApp('/signup');
    await userEvent.type(await screen.findByLabelText('Full name'), 'Lerato Mokoena');
    await userEvent.type(screen.getByLabelText('Work email'), 'lerato.new@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'a long enough password');
    await userEvent.click(screen.getByRole('button', { name: 'Ask for an account' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/admin will check your details/);
    expect(accounts.byEmail('lerato.new@example.com')?.status).toBe('pending');
  });
});

describe('what someone who isn’t an admin sees', () => {
  it('can look around, but not add, change, delete or approve', async () => {
    accounts.signInAs('ruan.botha@example.com');
    renderApp(`/?person=${SEED_IDS.engineeringManager}`);
    await screen.findByRole('heading', { level: 1, name: 'Johan van der Merwe' });
    expect(screen.queryByRole('button', { name: 'Add employee' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Accounts' })).not.toBeInTheDocument();
  });

  it('is sent away from the accounts page', async () => {
    accounts.signInAs('ruan.botha@example.com');
    const { router } = renderApp('/accounts');
    await screen.findByRole('heading', { level: 1, name: 'Thandi Nkosi' });
    expect(router.state.location.pathname).toBe('/');
  });
});

describe('approving accounts', () => {
  it('waits for an admin to choose who a new account belongs to', async () => {
    renderApp('/accounts');
    const item = (await screen.findByText('Amara Okafor')).closest('li')!;
    const picker = within(item).getByLabelText('Link to employee');
    // amara isn't an employee yet, so nobody is suggested and approve waits for a choice
    expect(picker).toHaveValue('');
    expect(within(item).getByRole('button', { name: 'Approve' })).toBeDisabled();

    // ruan already has an account, so he isn't offered
    expect(within(picker).queryByRole('option', { name: /Ruan Botha/ })).not.toBeInTheDocument();
  });

  it('only offers people below you who don’t have an account yet', async () => {
    accounts.signInAs('sipho.dlamini@example.com');
    renderApp('/accounts');
    const picker = await screen.findByLabelText('Link to employee');
    const names = within(picker)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(names.some((n) => n?.includes('Thandi Nkosi'))).toBe(false);
    expect(names.some((n) => n?.includes('Sipho Dlamini'))).toBe(false);
    expect(names.some((n) => n?.includes('Johan van der Merwe'))).toBe(false);
    expect(names.some((n) => n?.includes('Naledi Khumalo'))).toBe(true);
  });

  it('approves, and warns first when the email doesn’t match', async () => {
    renderApp('/accounts');
    const item = (await screen.findByText('Amara Okafor')).closest('li')!;
    const naledi = screen
      .getAllByRole('option')
      .find((o) => o.textContent?.startsWith('Naledi Khumalo')) as HTMLOptionElement;
    await userEvent.selectOptions(within(item).getByLabelText('Link to employee'), naledi.value);
    expect(within(item).getByText(/doesn’t match this employee’s/)).toBeInTheDocument();

    await userEvent.click(within(item).getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('Amara Okafor can sign in now')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText('Nobody is waiting. New sign ups will appear here.'),
      ).toBeInTheDocument(),
    );
    expect(accounts.byEmail('amara.okafor@example.com')?.status).toBe('active');
  });

  it('rejects a request', async () => {
    renderApp('/accounts');
    const item = (await screen.findByText('Amara Okafor')).closest('li')!;
    await userEvent.click(within(item).getByRole('button', { name: 'Reject' }));
    expect(await screen.findByText('Removed the request from Amara Okafor')).toBeInTheDocument();
    expect(accounts.byEmail('amara.okafor@example.com')).toBeUndefined();
  });

  it('lists the accounts of your team, and nobody above you', async () => {
    accounts.signInAs('sipho.dlamini@example.com');
    renderApp('/accounts');
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Johan van der Merwe')).toBeInTheDocument();
    expect(within(table).queryByText('Thandi Nkosi')).not.toBeInTheDocument();
  });
});

describe('accessibility of the account pages', () => {
  it('sign in', async () => {
    accounts.signInAs(null);
    renderApp('/signin');
    await screen.findByRole('heading', { name: 'Sign in' });
    await expectNoA11yProblems();
  });

  it('sign up, with errors showing', async () => {
    accounts.signInAs(null);
    renderApp('/signup');
    await userEvent.click(await screen.findByRole('button', { name: 'Ask for an account' }));
    await expectNoA11yProblems();
  });

  it('accounts', async () => {
    renderApp('/accounts');
    await screen.findByText('Amara Okafor');
    await expectNoA11yProblems();
  });
});
