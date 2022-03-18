import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteExternalsPlugin } from 'vite-plugin-externals'

export default defineConfig(async({ mode }) => {
  return {
    plugins: [
      vue(),
      mode === 'production'
        ? viteExternalsPlugin({
          vue: 'Vue',
          vant: 'vant',
        })
        : undefined,
    ],
  }
})
