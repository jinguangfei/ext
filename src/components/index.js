// 组件库入口文件
import TabSelector from './TabSelector/TabSelector.vue'
import DataDisplay from './DataDisplay/DataDisplay.vue'
import CookieInjector from './CookieInjector/CookieInjector.vue'
import ConfigDisplay from './ConfigDisplay/ConfigDisplay.vue'
import TaskScheduler from './TaskScheduler/TaskScheduler.vue'

// 导出所有组件
export {
  TabSelector,
  DataDisplay,
  CookieInjector,
  ConfigDisplay,
  TaskScheduler
}

// 默认导出，支持全局注册
export default {
  TabSelector,
  DataDisplay,
  CookieInjector,
  ConfigDisplay,
  TaskScheduler
}
