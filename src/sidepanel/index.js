import { createApp } from 'vue'
import naive from 'naive-ui'
import 'virtual:uno.css'

import SidePanel from './SidePanel.vue'

createApp(SidePanel).use(naive).mount('#app')
