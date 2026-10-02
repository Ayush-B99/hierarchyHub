import { Link } from 'react-router';
import { Panel } from '../components/ui/Panel';

export function NotFoundPage() {
  return (
    <Panel style={{ padding: 40, textAlign: 'center' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 32, letterSpacing: '-0.03em' }}>Page not found</h1>
      <p className="muted" style={{ margin: '0 0 20px' }}>
        That page doesn't exist. It may have moved.
      </p>
      <Link to="/">Go to Explore</Link>
    </Panel>
  );
}
