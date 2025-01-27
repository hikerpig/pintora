//@ts-check
import tseslint from 'typescript-eslint'
import prettierPlugin from 'eslint-plugin-prettier'
import unusedImportPlugin from 'eslint-plugin-unused-imports'

export default [
  ...tseslint.config(...tseslint.configs.recommended),
  {
    plugins: {
      prettier: prettierPlugin,
      'unused-imports': unusedImportPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-this-alias': 'warn',
      '@typescript-eslint/no-extra-semi': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': 'off',
      'unused-imports/no-unused-imports': 'error',
      'prefer-spread': 0,
      'prettier/prettier': 'warn',
    },
  },
]
