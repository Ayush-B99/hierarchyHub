import { signInSchema } from '@hierarchy-hub/shared';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/Button';
import { api, ApiError } from '../../lib/api';
import { AuthLayout } from './AuthLayout';
import { safeNext } from './safeNext';
import styles from './AuthLayout.module.css';
import { useAuth } from './useAuth';

export function SignInPage() {
  const { me, signedIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (me) return <Navigate to={next} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = signInSchema.safeParse({
      email: form.get('email'),
      password: form.get('password'),
    });
    if (!parsed.success) {
      setProblem('Enter your email and password.');
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      signedIn(await api.signIn(parsed.data));
      navigate(next, { replace: true });
    } catch (error) {
      setProblem(
        error instanceof ApiError ? error.message : 'We couldn’t reach Hierarchy Hub. Try again.',
      );
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Sign in" intro="Welcome back. Sign in with your work email.">
      <form className={styles.form} onSubmit={submit} noValidate>
        {problem && (
          <p className={styles.banner} data-tone="error" role="alert">
            {problem}
          </p>
        )}
        <div className={styles.field}>
          <label htmlFor="signin-email">Email</label>
          <input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="signin-password">Password</label>
          <input
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" variant="primary" className={styles.submit} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className={styles.switch}>
        New here? <Link to="/signup">Ask for an account</Link>
      </p>
    </AuthLayout>
  );
}
