<template>
  <div class="config-display-container">
    <!-- 标签页选择器 -->
    <n-card title="选择标签页" size="small" class="tab-selector-card">
      <TabSelector 
        ref="tabSelectorRef"
        @tab-change="handleTabChange"
        @update:tabs="handleTabsUpdate"
      />
      <n-card title="当前默认配置" size="small" class="config-card">
        <n-alert v-if="defaultConfig" type="success" :title="`${defaultConfig.name} (${defaultConfig.type})`">
          <n-button 
            :type="isAbleConfig ? 'success' : 'error'"
            @click="toggleDebug"
          >
            {{ isAbleConfig ? '配置可用' : '配置不可用' }}
          </n-button>
        </n-alert>
        <n-alert v-else type="warning" title="没有设置默认配置">
          请先在options页面设置默认配置
        </n-alert>
      </n-card>
    </n-card>
    
    <!-- 当前默认配置 -->
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { NCard, NAlert, NTag, NSpace, NButton, NButtonGroup } from 'naive-ui'
import { DatabaseClient } from '../../shared/db-utils.js'
import TabSelector from '../TabSelector/TabSelector.vue'

// Props
const props = defineProps({
})

// Emits - 移除所有向上传递的事件，ConfigDisplay 作为最上层选择器
// const emit = defineEmits(['config-loaded', 'tab-change', 'debug-status-changed', 'tabs-update'])

// 响应式数据
const defaultConfig = ref(null)
const tabs = ref([])
const tabSelectorRef = ref(null)

// 计算属性 当前tab
const currentTab = computed(() => {
  return tabs.value.find(tab => tab.active)
})

// 计算属性: 当前配置是否可用
const isAbleConfig = computed(() => {
  console.log('[ConfigDisplay] 当前配置是否可用:', defaultConfig.value, tabs.value, currentTab.value)
  if (!defaultConfig.value) return false
  // 简单匹配逻辑：根据配置的type和name进行匹配
  if (defaultConfig.value.type !== 'network') {
    return true
  } else if (currentTab.value.isDebug) {
    return true
  } else {
    // 对于network类型，检查是否有正在调试的标签页
    return false
  }
})

// 加载默认配置
const loadDefaultConfig = async () => {
  try {
    // 先尝试直接获取default_config
    const config = await DatabaseClient.get('default_config')
    defaultConfig.value = config || null
    // 不再向上传递配置加载事件
    console.log('[ConfigDisplay] 配置已加载:', defaultConfig.value)
  } catch (error) {
    console.error('[ConfigDisplay] 加载配置失败:', error)
  }
}

// 实时监听storage变化
let storageUnlisten = null

const setupStorageListener = () => {
  // 使用DatabaseClient的监听方法
  storageUnlisten = DatabaseClient.listen('default_config', (change) => {
    console.log('[ConfigDisplay] 检测到配置变化:', change)
    defaultConfig.value = change.newValue
    // 不再向上传递配置变化事件
  })
}

// 处理标签页选择变化
const handleTabChange = (tab) => {
  chrome.tabs.update(tab.id, { active: true })
  console.log('[ConfigDisplay] 标签页选择变化:', tab)
}


// 处理标签页列表更新
const handleTabsUpdate = (updatedTabs) => {
  console.log('[ConfigDisplay] 标签页列表更新:', updatedTabs)
  tabs.value = updatedTabs
}
const toggleDebug = () => {
  if (currentTab.value.isDebug) {
    tabSelectorRef.value.tabDetach(currentTab.value.id)
  } else {
    tabSelectorRef.value.tabAttach(currentTab.value.id)
  }
}


// 组件挂载时加载配置并设置监听器
onMounted(async () => {
  await loadDefaultConfig()
  setupStorageListener()
})

// 组件卸载时清理监听器
onUnmounted(() => {
  // 清理DatabaseClient的监听器
  if (storageUnlisten) {
    storageUnlisten()
    storageUnlisten = null
    console.log('[ConfigDisplay] 组件卸载，清理storage监听器')
  }
})

</script>

<style scoped>
</style>
