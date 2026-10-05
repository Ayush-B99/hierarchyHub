import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './useAuth';

/** the pages behind it are only for signed in people, everyone else goes to sign in first */
export function RequireSignIn() {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!me) {
    const next = `${location.pathname}${location.search}`;
    return (
      <Navigate to={`/signin${next === '/' ? '' : `?next=${encodeURIComponent(next)}`}`} replace />
    );
  }
  return <Outlet />;
}

/** pages only admins can open. the api checks this too, this just keeps others out of a dead end */
export function RequireAdmin() {
  const { me } = useAuth();
  return me?.isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}
