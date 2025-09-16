<script setup lang="js">
import { ref, onMounted, onUnmounted, computed, h } from 'vue'
import { NButton, NSpace, NCard, NTag, NAlert, NDataTable } from 'naive-ui'
import { DatabaseClient} from '../shared/db-utils.js'
import { getCurrentTab, setupTabListeners, sendMessageToBackground, sendMessageToAllTabs } from '../shared/chrome_utils.js'
import { formatDataSize, downloadData } from '../shared/utils.js'

// 响应式数据
const defaultConfig = ref(null) // 当前默认配置
const currentTab = ref(null) // 当前活动标签页
const interceptedData = ref([]) // 拦截到的数据
const loading = ref(false) // 加载状态


// 加载默认配置
const loadDefaultConfig = async () => {
  try {
    // 先尝试直接获取default_config
    const config = await DatabaseClient.get('default_config')
    defaultConfig.value = config || null
  } catch (error) {
  }
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
  } catch (error) {
  } finally {
    loading.value = false
  }
}

// 监听拦截到的数据
const listenToInterceptedData = () => {
  // 收到的信息处理
  function handleInterceptedData(data) {
    // 添加到拦截数据列表
    interceptedData.value.unshift({
      id: Date.now(),
      date: new Date(data.timestamp).toLocaleString(),
      name: data.config.name,
      type: data.config.type,
      data: data.response
    })
    // 限制最多显示50条记录
    if (interceptedData.value.length > 3) {
      interceptedData.value = interceptedData.value.slice(0, 3)
    }
  }
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'UPLOAD_OBSERVED_RESPONSE') {
      console.log('[SidePanel] 收到拦截数据:', request.data)
      handleInterceptedData(request.data)
      sendResponse({ success: true })
    }
    return true
  })
  chrome.storage.local.onChanged.addListener((changes, areaName) => {
    if (changes['network_observed_response']) {
      handleInterceptedData(changes['network_observed_response'].newValue.data)
    }
  })
}

// 清空拦截数据
const clearInterceptedData = () => {
  interceptedData.value = []
}

// 刷新默认配置
const refreshDefaultConfig = async () => {
  await loadDefaultConfig()
}


// 格式化拦截数据显示
const formatInterceptedData = (data) => {
  return {
    ...data,
    dataSize: formatDataSize(data.data),
    originalData: data.data // 保存原始数据用于下载
  }
}

// 拦截数据表格列定义
const interceptedColumns = [
  {
    title: '时间',
    key: 'date',
    width: 160
  },
  {
    title: '名称',
    key: 'name',
    width: 80
  },
  {
    title: '类型',
    key: 'type',
    width: 80,
    render: (row) => {
      const typeMap = {
        network: { text: 'Network', type: 'info' },
        xhr: { text: 'XHR', type: 'success' },
        html: { text: 'HTML', type: 'warning' }
      }
      const typeInfo = typeMap[row.type] || { text: row.type, type: 'default' }
      return h(NTag, { type: typeInfo.type, size: 'small' }, { default: () => typeInfo.text })
    }
  },
  {
    title: '数据大小',
    key: 'dataSize',
    width: 100,
    render: (row) => {
      return h(NButton, {
        size: 'small',
        type: 'primary',
        text: true,
        onClick: () => downloadData(row.originalData, `${row.name}_${row.date.replace(/[^\w]/g, '_')}`)
      }, { default: () => row.dataSize })
    }
  }
]

// 计算属性：格式化后的拦截数据
const formattedInterceptedData = computed(() => {
  return interceptedData.value.map(formatInterceptedData)
})

onMounted(async () => {
  await loadDefaultConfig()
  setupTabListeners(currentTab) // 设置标签页监听器
  listenToInterceptedData()
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


      <!-- 当前活动标签页 -->
      <n-card title="当前活动标签页" size="small" class="tab-card" v-if="currentTab">
        <n-alert type="info" :title="currentTab.title">
          <template #header-extra>
            <n-tag type="info" size="small">{{ currentTab.url }}</n-tag>
          </template>
        </n-alert>
      </n-card>

      <!-- 默认配置展示 -->
      <n-card title="当前默认配置" size="small" class="config-card">
        <div v-if="defaultConfig">
          <n-alert type="success" :title="`${defaultConfig.name} (${defaultConfig.type})`">
            <template #header-extra>
              <n-tag type="success" size="small">{{ defaultConfig.domain }}</n-tag>
            </template>
            <p>域名: {{ defaultConfig.domain }}</p>
            <p>类型: {{ defaultConfig.type }}</p>
            <p>URL白名单: {{ defaultConfig.url_whitelist?.join(', ') || '无' }}</p>
            <p>URL黑名单: {{ defaultConfig.url_blacklist?.join(', ') || '无' }}</p>
          </n-alert>
          
          <n-space style="margin-top: 16px;">
            <n-button 
              type="primary" 
              @click="broadcastDefaultConfig"
              :loading="loading"
            >
              广播默认配置
            </n-button>
            <n-button 
              @click="refreshDefaultConfig"
            >
              刷新配置
            </n-button>
          </n-space>
        </div>
        <div v-else>
          <n-alert type="warning" title="没有设置默认配置">
            请先在options页面设置默认配置
          </n-alert>
          
          <n-space style="margin-top: 16px;">
            <n-button 
              @click="refreshDefaultConfig"
            >
              刷新配置
            </n-button>
          </n-space>
        </div>
      </n-card>

      <!-- 拦截数据展示 -->
      <n-card title="拦截到的数据" size="small" class="intercepted-card">
        <template #header-extra>
          <n-space>
            <n-tag type="info" size="small">
              共 {{ interceptedData.length }} 条
            </n-tag>
            <n-button 
              size="small" 
              type="error" 
              @click="clearInterceptedData"
            >
              清空
            </n-button>
          </n-space>
        </template>

        <div v-if="interceptedData.length > 0">
          <n-data-table
            :columns="interceptedColumns"
            :data="formattedInterceptedData"
            :pagination="false"
            size="small"
            max-height="400"
          />
        </div>
        <div v-else>
          <n-alert type="info" title="暂无拦截数据">
            等待网络请求被拦截...
          </n-alert>
        </div>
      </n-card>

    </div>
  </n-config-provider>
</template>

<style scoped>
.sidepanel-container {
  padding: 16px;
  max-width: 100%;
  overflow-x: auto;
}
</style>