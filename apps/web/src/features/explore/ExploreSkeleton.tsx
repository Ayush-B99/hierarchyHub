import { Bone } from '../../components/feedback/Skeleton';
import { Panel } from '../../components/ui/Panel';

/** roughly the shape of the explore page, so nothing jumps around when the data arrives */
export function ExploreSkeleton() {
  return (
    <div role="status" aria-label="Loading the organisation">
      <Panel
        variant="solid"
        style={{
          padding: 26,
          marginBottom: 26,
          minHeight: 260,
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ width: 'min(520px, 100%)' }}>
          <Bone width="70%" height={56} />
          <Bone width="40%" height={18} style={{ marginTop: 16 }} />
        </div>
      </Panel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        <Panel style={{ flex: '1 1 220px', maxWidth: 270, padding: 24, display: 'grid', gap: 14 }}>
          <Bone width="70%" height={18} />
          <Bone height={40} />
          <Bone height={40} />
          <Bone height={40} />
        </Panel>
        <div
          style={{
            flex: '999 1 560px',
            display: 'grid',
            justifyItems: 'center',
            gap: 24,
            paddingTop: 20,
          }}
        >
          <Bone width={140} height={150} radius={28} />
          <Bone width={260} height={220} radius={40} />
          <div style={{ display: 'flex', gap: 24 }}>
            <Bone width={140} height={150} radius={28} />
            <Bone width={140} height={150} radius={28} />
            <Bone width={140} height={150} radius={28} />
          </div>
        </div>
        <Panel style={{ flex: '1 1 290px', maxWidth: 350, padding: 24, display: 'grid', gap: 14 }}>
          <Bone width="40%" height={18} />
          <div style={{ display: 'flex', gap: 10 }}>
            <Bone width={70} height={70} radius={35} />
            <Bone width={70} height={70} radius={35} />
            <Bone width={70} height={70} radius={35} />
          </div>
          <Bone height={16} />
          <Bone height={16} />
          <Bone height={16} />
        </Panel>
      </div>
    </div>
  );
}
