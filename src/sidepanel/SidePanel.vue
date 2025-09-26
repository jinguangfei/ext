<script setup lang="js">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { NButton, NSpace, NCard, NTag, NAlert, NDivider } from 'naive-ui'
import { DataDisplay, CookieInjector, ConfigDisplay, TaskScheduler } from '../components/index.js'


// 任务调度器组件引用
const taskSchedulerRef = ref(null)
const configDisplayRef = ref(null)

const currentTab = computed(() => {
  return configDisplayRef.value?.currentTab
})
const defaultConfig = computed(() => {
  return configDisplayRef.value?.defaultConfig
})
const isAbleConfig = computed(() => {
  return configDisplayRef.value?.isAbleConfig
})

// 添加响应式数据来确保数据同步
const currentConfig = ref(null)
const currentTabData = ref(null)
const configAbleStatus = ref(false)

// 当前激活的标签页
const activeTab = ref('scheduler')

// 标签页配置
const tabs = ref([
  { name: 'scheduler', label: '任务调度器' },
  { name: 'config', label: '配置管理' },
  { name: 'cookie', label: 'Cookie工具' }
])

// 监听 configDisplayRef 的变化，确保数据同步
watch(configDisplayRef, (newRef) => {
  if (newRef) {
    // 立即同步数据
    currentConfig.value = newRef.defaultConfig
    currentTabData.value = newRef.currentTab
    configAbleStatus.value = newRef.isAbleConfig
    
    // 监听内部数据变化
    watch(() => newRef.defaultConfig, (newVal) => {
      currentConfig.value = newVal
    }, { immediate: true })
    
    watch(() => newRef.currentTab, (newVal) => {
      currentTabData.value = newVal
    }, { immediate: true })
    
    watch(() => newRef.isAbleConfig, (newVal) => {
      configAbleStatus.value = newVal
    }, { immediate: true })
  }
}, { immediate: true })


// 处理标签页切换
const handleTabChange = (tabName) => {
  activeTab.value = tabName
}

onMounted(async () => {
  console.log('[SidePanel] 所有组件一次性加载完成')
})

// 组件卸载时清理监听器
onUnmounted(() => {
  // Chrome扩展的监听器会在扩展卸载时自动清理，但这里可以添加其他清理逻辑
  console.log('[SidePanel] 组件卸载，清理资源')
})

</script>

<template>
  <n-config-provider>
    <div class="sidepanel-container">
      <!-- 自定义标签页头部 -->
      <div class="custom-tabs-header">
        <div 
          v-for="tab in tabs" 
          :key="tab.name"
          :class="['tab-header', { active: activeTab === tab.name }]"
          @click="handleTabChange(tab.name)"
        >
          {{ tab.label }}
        </div>
      </div>

      <!-- 所有组件一次性加载，只控制显示/隐藏 -->
      <div class="tab-content-container">
        <!-- 任务调度器组件 -->
        <div v-show="activeTab === 'scheduler'" class="tab-content">
          <TaskScheduler 
            ref="taskSchedulerRef"
            :default-config="currentConfig"
            :current-tab="currentTabData"
            :is-able-config="configAbleStatus"
          />
        </div>

        <!-- 配置管理组件 -->
        <div v-show="activeTab === 'config'" class="tab-content">
          <ConfigDisplay ref="configDisplayRef" />
        </div>

        <!-- Cookie工具组件 -->
        <div v-show="activeTab === 'cookie'" class="tab-content">
          <CookieInjector 
            @inject-success="(data) => console.log('[SidePanel] Cookie注入成功:', data)"
            @inject-error="(error) => console.error('[SidePanel] Cookie注入失败:', error)"
          />
        </div>
      </div>
    </div>
  </n-config-provider>
</template>

<style scoped>
.sidepanel-container {
  padding: 16px;
  max-width: 100%;
  overflow-x: auto;
  height: 100vh;
  box-sizing: border-box;
}

/* 自定义标签页样式 */
.custom-tabs-header {
  display: flex;
  border-bottom: 1px solid #e0e0e6;
  margin-bottom: 16px;
  background: #fafafa;
  border-radius: 6px 6px 0 0;
}

.tab-header {
  padding: 12px 20px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
  font-size: 14px;
  color: #666;
  background: transparent;
  border-radius: 6px 6px 0 0;
}

.tab-header:hover {
  color: #18a058;
  background: rgba(24, 160, 88, 0.05);
}

.tab-header.active {
  color: #18a058;
  border-bottom-color: #18a058;
  background: #fff;
  font-weight: 500;
}

.tab-content-container {
  height: calc(100% - 60px);
  overflow-y: auto;
}

.tab-content {
  height: 100%;
  overflow-y: auto;
}

.selected-tab-info {
  margin-top: 12px;
}

.selected-tab-info p {
  margin: 4px 0;
  font-size: 14px;
}

.demo-controls h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 14px;
}
</style>