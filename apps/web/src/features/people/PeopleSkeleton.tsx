import { Bone } from '../../components/feedback/Skeleton';
import { Panel } from '../../components/ui/Panel';

/** placeholder for the sentence and table while people load */
export function PeopleSkeleton() {
  return (
    <div role="status" aria-label="Loading people">
      <Panel style={{ padding: 32, marginBottom: 24, display: 'grid', gap: 18 }}>
        <Bone width="80%" height={44} />
        <Bone width="55%" height={44} />
        <Bone width={320} height={48} radius={999} style={{ maxWidth: '100%' }} />
      </Panel>
      <Panel variant="solid" style={{ padding: 16, display: 'grid', gap: 14 }}>
        <Bone height={52} radius={24} />
        {Array.from({ length: 8 }, (_, i) => (
          <Bone key={i} height={44} />
        ))}
      </Panel>
    </div>
  );
}
