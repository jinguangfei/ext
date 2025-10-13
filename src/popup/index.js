import { createApp } from 'vue'
import naive from 'naive-ui'
import 'virtual:uno.css'

import Popup from './Popup.vue'

createApp(Popup).use(naive).mount('#app')
