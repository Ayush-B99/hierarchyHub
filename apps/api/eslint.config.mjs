import { nodeConfig } from '@hierarchy-hub/eslint-config/node';

export default [...nodeConfig, { ignores: ['*.config.js', 'test/*.config.js'] }];
