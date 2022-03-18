import { createApp } from 'vue'
import App from './App.vue'
import { Vant } from './vant'

const app = createApp(App)

app.use(Vant).mount('#app')
