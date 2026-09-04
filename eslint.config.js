import antfu from '@antfu/eslint-config'
import nextPlugin from '@next/eslint-plugin-next'
import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss'
import jsxA11y from 'eslint-plugin-jsx-a11y'

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

    ignores: ['migrations/**/*', 'next-env.d.ts', 'src/components/ui/*'],
  },
  jsxA11y.flatConfigs.recommended,
  {
    plugins: {
      'better-tailwindcss': eslintPluginBetterTailwindcss,
    },
    rules: {
      ...eslintPluginBetterTailwindcss.configs['recommended-warn'].rules,
      ...eslintPluginBetterTailwindcss.configs['recommended-error'].rules,
      'better-tailwindcss/enforce-consistent-line-wrapping': 'warn',
      'better-tailwindcss/enforce-consistent-class-order': 'warn',
      'better-tailwindcss/no-unknown-classes': ['error', {
        ignore: ['toaster', 'typography', 'typography-disabled', 'document-container'],
      }],
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: './src/app/globals.css',
      },
    },
  },
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
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
      'better-tailwindcss': {
        entryPoint: 'src/app/globals.css',
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
