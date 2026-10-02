// Enforces Conventional Commits, e.g. "feat(api): add employee endpoints".
// Scopes mirror the workspace so history can be filtered per package.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['api', 'web', 'shared', 'tsconfig', 'eslint-config', 'infra', 'docs', 'ci', 'deps', 'repo'],
    ],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
  },
};
