# TaskScheduler 组件

## 概述

TaskScheduler 是一个独立的Vue组件，用于管理自动任务调度和数据拦截处理。该组件从SidePanel.vue中抽取出来，提供了完整的任务调度功能。

## 功能特性

- **自动任务调度**: 根据配置的间隔时间自动获取和执行任务
- **倒计时显示**: 实时显示下次任务执行倒计时
- **任务状态管理**: 显示当前任务执行状态
- **数据拦截处理**: 处理拦截到的数据并发送到服务器
- **智能超时机制**: 根据服务器返回结果设置临时超时

## 使用方法

### 1. 导入组件

```javascript
import { TaskScheduler } from '../components/index.js'
```

### 2. 在模板中使用

```vue
<template>
  <TaskScheduler 
    ref="taskSchedulerRef"
    :default-config="defaultConfig"
    :current-tab="currentTab"
    @task-completed="handleTaskCompleted"
    @task-error="handleTaskError"
    @status-changed="handleStatusChanged"
  />
</template>
```

### 3. Props

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| defaultConfig | Object | null | 默认配置对象，包含timeout等设置 |
| currentTab | Object | null | 当前活动标签页对象 |

### 4. Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| task-completed | data | 任务完成时触发，包含任务信息和响应数据 |
| task-error | error | 任务执行出错时触发 |
| status-changed | status | 调度器状态变更时触发（'running'/'stopped'） |

### 5. 暴露的方法

通过ref可以调用以下方法：

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| startTaskScheduler | - | Promise | 启动任务调度器 |
| stopTaskScheduler | - | void | 停止任务调度器 |
| fetchAndExecuteTask | - | Promise | 立即执行任务 |
| sendInterceptedDataToServer | data | Promise | 发送拦截数据到服务器 |

### 6. 使用示例

```vue
<script setup>
import { ref } from 'vue'
import { TaskScheduler } from '../components/index.js'

const taskSchedulerRef = ref(null)
const defaultConfig = ref({
  timeout: 60,
  break_flag: ['login', 'deny']
})
const currentTab = ref(null)

const handleTaskCompleted = (data) => {
  console.log('任务完成:', data)
}

const handleTaskError = (error) => {
  console.error('任务错误:', error)
}

const handleStatusChanged = (status) => {
  console.log('调度器状态:', status)
}

// 手动启动调度器
const startScheduler = () => {
  taskSchedulerRef.value?.startTaskScheduler()
}
</script>

<template>
  <div>
    <TaskScheduler 
      ref="taskSchedulerRef"
      :default-config="defaultConfig"
      :current-tab="currentTab"
      @task-completed="handleTaskCompleted"
      @task-error="handleTaskError"
      @status-changed="handleStatusChanged"
    />
    
    <button @click="startScheduler">启动调度器</button>
  </div>
</template>
```

## 配置要求

使用TaskScheduler组件需要确保：

1. **默认配置**: 必须设置包含`timeout`字段的默认配置
2. **API接口**: 确保后端API接口`/config/get_task`和`/config/over_task`可用
3. **Chrome扩展权限**: 需要相应的Chrome扩展权限来访问标签页和网络请求

## 注意事项

1. 组件会自动管理定时器，无需手动清理
2. 临时超时期间调度器会暂停执行，这是正常行为
3. 组件依赖Chrome扩展环境，在普通Web环境中可能无法正常工作
4. 确保在组件卸载前停止调度器以避免内存泄漏

## 迁移说明

从SidePanel.vue迁移到TaskScheduler组件：

1. 移除SidePanel.vue中的任务调度器相关代码
2. 导入并使用TaskScheduler组件
3. 将相关状态和方法调用改为通过组件ref进行
4. 处理组件事件以保持原有功能
