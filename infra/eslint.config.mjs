import { nodeConfig } from '@hierarchy-hub/eslint-config/node';

export default [...nodeConfig, { ignores: ['cdk.out/**'] }];
