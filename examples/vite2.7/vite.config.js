import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteExternalsPlugin } from 'vite-plugin-externals'

export default defineConfig(async() => {
  return {
    plugins: [
      vue(),
      viteExternalsPlugin({
        vue: 'Vue',
        vant: 'vant',
      }, {
        disableInServe: true,
      }),
    ],
  }
})
