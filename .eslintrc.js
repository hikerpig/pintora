module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module',
  },
  ignorePatterns: ['packages/pintora-diagrams/src/*/parser/*.[jt]s'],
  plugins: ['@typescript-eslint', 'prettier', 'unused-imports'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-this-alias': 'warn',
    '@typescript-eslint/no-extra-semi': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^_' }],
    'unused-imports/no-unused-imports': 'error',
    'prefer-spread': 0,
    'prettier/prettier': 'warn',
  },
}
