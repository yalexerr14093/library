export default [
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
      },
    },
    rules: {
      // Without eslint-plugin-react, JSX usage looks "unused" to ESLint core.
      'no-unused-vars': 'off',
      'no-undef': 'error',
    },
  },
]

