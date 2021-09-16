import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import { viteExternalsPlugin } from 'vite-plugin-externals'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    reactRefresh(),
    viteExternalsPlugin({
      react: 'React',
      'react-dom': 'ReactDOM',
    }),
  ],
  css: {
    preprocessorOptions: {
      less: {
        // 允许链式调用的换行
        javascriptEnabled: true,
      },
    },
  },
})
