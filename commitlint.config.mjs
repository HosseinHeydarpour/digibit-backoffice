// Commit message rules for this repository.
// Conventional Commits (Angular/Google style), enforced by the Husky `commit-msg` hook.
// See AGENTS.md for the human-readable version of these rules.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Types this project allows.
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
    // Scopes come from ARCHITECTURE.md section 3 plus the tooling scopes.
    'scope-enum': [
      2,
      'always',
      [
        'auth',
        'dashboard',
        'products',
        'categories',
        'brands',
        'orders',
        'customers',
        'coupons',
        'shipping',
        'banners',
        'settings',
        'comments',
        'tickets',
        'core',
        'shared',
        'layout',
        'build',
        'ci',
        'deps',
        'docs',
      ],
    ],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 100],
  },
};
