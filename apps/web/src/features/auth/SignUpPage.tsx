import { PASSWORD_MIN, signUpSchema } from '@hierarchy-hub/shared';
import { useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { Link, Navigate } from 'react-router';
import { Button } from '../../components/ui/Button';
import { api, ApiError } from '../../lib/api';
import { AuthLayout } from './AuthLayout';
import styles from './AuthLayout.module.css';
import { useAuth } from './useAuth';

type Field = 'name' | 'email' | 'password';

export function SignUpPage() {
  const { me } = useAuth();
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (me) return <Navigate to="/" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const parsed = signUpSchema.safeParse({
      name: data.get('name'),
      email: data.get('email'),
      password: data.get('password'),
    });
    if (!parsed.success) {
      const found = parsed.error.flatten().fieldErrors as Partial<Record<Field, string[]>>;
      setErrors({ name: found.name?.[0], email: found.email?.[0], password: found.password?.[0] });
      // take people straight to the first thing to fix
      const first = (['name', 'email', 'password'] as const).find((f) => found[f]);
      if (first) form.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    setBusy(true);
    setProblem(null);
    try {
      setDone((await api.signUp(parsed.data)).message);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        const f = error.fieldErrors as Partial<Record<Field, string[]>>;
        setErrors({ name: f.name?.[0], email: f.email?.[0], password: f.password?.[0] });
      } else {
        setProblem(
          error instanceof ApiError ? error.message : 'We couldn’t reach Hierarchy Hub. Try again.',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthLayout title="Thanks" intro="Your request is in.">
        <p className={styles.banner} role="status">
          {done}
        </p>
        <p className={styles.switch}>
          <Link to="/signin">Back to sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  const field = (
    name: Field,
    label: string,
    input: InputHTMLAttributes<HTMLInputElement>,
    hint?: string,
  ) => (
    <div className={styles.field}>
      <label htmlFor={`signup-${name}`}>{label}</label>
      <input
        id={`signup-${name}`}
        name={name}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={
          errors[name] ? `signup-${name}-error` : hint ? `signup-${name}-hint` : undefined
        }
        {...input}
      />
      {errors[name] ? (
        <p id={`signup-${name}-error`} className={styles.fieldError}>
          {errors[name]}
        </p>
      ) : (
        hint && (
          <p id={`signup-${name}-hint`} className={styles.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  );

  return (
    <AuthLayout
      title="Ask for an account"
      intro="An admin will check who you are and link your account to your employee record."
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        {problem && (
          <p className={styles.banner} data-tone="error" role="alert">
            {problem}
          </p>
        )}
        {field('name', 'Full name', { autoComplete: 'name', autoFocus: true })}
        {field('email', 'Work email', { type: 'email', autoComplete: 'email' })}
        {field(
          'password',
          'Password',
          { type: 'password', autoComplete: 'new-password' },
          `At least ${PASSWORD_MIN} characters. A few words you'll remember works well.`,
        )}
        <Button type="submit" variant="primary" className={styles.submit} disabled={busy}>
          {busy ? 'Sending…' : 'Ask for an account'}
        </Button>
      </form>
      <p className={styles.switch}>
        Already approved? <Link to="/signin">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
