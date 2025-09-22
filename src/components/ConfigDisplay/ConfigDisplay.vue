<template>
  <n-card title="当前默认配置" size="small" class="config-card">
    <div v-if="defaultConfig">
      <n-alert type="success" :title="`${defaultConfig.name} (${defaultConfig.type})`">
      </n-alert>
      
      <n-space style="margin-top: 16px;">
        <n-button 
          type="primary" 
          @click="handleBroadcastConfig"
          :loading="loading"
        >
          广播默认配置
        </n-button>
      </n-space>
    </div>
    <div v-else>
      <n-alert type="warning" title="没有设置默认配置">
        请先在options页面设置默认配置
      </n-alert>
      
    </div>
  </n-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { NCard, NAlert, NTag, NSpace, NButton } from 'naive-ui'
import { DatabaseClient } from '../../shared/db-utils.js'
import { sendMessageToBackground, sendMessageToAllTabs } from '../../shared/chrome_utils.js'

// Props
const props = defineProps({
  // 可以接收外部传入的配置
  config: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['config-loaded', 'config-broadcasted'])

// 响应式数据
const defaultConfig = ref(props.config)
const loading = ref(false)

// 加载默认配置
const loadDefaultConfig = async () => {
  try {
    // 先尝试直接获取default_config
    const config = await DatabaseClient.get('default_config')
    defaultConfig.value = config || null
    emit('config-loaded', defaultConfig.value)
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
    emit('config-loaded', defaultConfig.value)
  })
}

// 广播默认配置
const broadcastDefaultConfig = async () => {
  if (!defaultConfig.value) {
    return
  }

  loading.value = true
  try {
    sendMessageToBackground({ 
      type: 'OBSERVED_CONFIG', 
      config: defaultConfig.value 
    })
    let successCount = await sendMessageToAllTabs({ 
      type: 'OBSERVED_CONFIG', 
      config: defaultConfig.value 
    })
    console.log(`配置 "${defaultConfig.value.name}" 已广播到 ${successCount} 个标签页`)
    emit('config-broadcasted', { config: defaultConfig.value, successCount })
  } catch (error) {
    console.error('[ConfigDisplay] 广播配置失败:', error)
  } finally {
    loading.value = false
  }
}


// 事件处理函数
const handleBroadcastConfig = () => {
  broadcastDefaultConfig()
}

// 监听props变化
watch(() => props.config, (newConfig) => {
  defaultConfig.value = newConfig
})

// 组件挂载时加载配置并设置监听器
onMounted(async () => {
  if (!props.config) {
    await loadDefaultConfig()
  }
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

// 暴露方法给父组件
defineExpose({
  loadDefaultConfig,
  broadcastDefaultConfig,
  defaultConfig
})
</script>

<style scoped>
.config-card {
  margin-bottom: 16px;
}
</style>
