import antfu from '@antfu/eslint-config'
import nextPlugin from '@next/eslint-plugin-next'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tailwind from 'eslint-plugin-tailwindcss'

export default antfu(
  {
    react: true,
    typescript: true,

    lessOpinionated: false,
    isInEditor: false,

    stylistic: {
      semi: false,
    },

    formatters: {
      css: true,
    },

    ignores: [
      'migrations/**/*',
      'next-env.d.ts',
      'components/ui/*',
    ],
  },
  ...tailwind.configs['flat/recommended'],
  jsxA11y.flatConfigs.recommended,
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  {
    rules: {
      'style/brace-style': ['error', '1tbs'], // Use the default brace style
      'ts/consistent-type-definitions': ['error', 'type'], // Use `type` instead of `interface`
      'react/prefer-destructuring-assignment': 'off', // Vscode doesn't support automatically destructuring, it's a pain to add a new variable
      'node/prefer-global/process': 'off', // Allow using `process.env`
    },
  },
  {
    settings: {
      'tailwindcss': {
        callees: ['cn', 'clsx'],
      },
      'jsx-a11y': {
        polymorphicPropName: 'as',
        components: {
          Input: 'input',
          Select: 'input',
        },
      },
    },
  },
)
