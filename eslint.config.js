import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'

export default [
  // Base JS recommended rules
  js.configs.recommended,

  // Vue 3 recommended rules
  ...pluginVue.configs['flat/recommended'],

  // Global ignores
  {
    ignores: ['node_modules/**', 'dist/**', '.netlify/**']
  },

  // Project-specific overrides
  {
    rules: {
      // Allow unused vars prefixed with underscore
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // Vue-specific relaxations
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off'
    }
  }
]
