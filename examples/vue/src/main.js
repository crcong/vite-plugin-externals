import { createApp } from 'vue'
import { ElButton } from 'element-plus'
import App from '@/App.vue'
import 'element-plus/packages/theme-chalk/src/base.scss'

const app = createApp(App)

app.component(ElButton.name, ElButton)

app.mount('#app')
