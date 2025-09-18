<script setup lang="js">
import { ref, onMounted, onUnmounted, computed, h } from 'vue'
import { NButton, NSpace, NCard, NTag, NAlert, NDataTable } from 'naive-ui'
import { DatabaseClient} from '../shared/db-utils.js'
import { getCurrentTab, setupTabListeners, sendMessageToBackground, sendMessageToAllTabs, gotoUrl } from '../shared/chrome_utils.js'
import { getUA, getCookieStr, setCookie, setUserAgent } from '../shared/chrome_utils.js'
import { formatDataSize, downloadData } from '../shared/utils.js'
import { api } from '../api/index.js'

// 响应式数据
const defaultConfig = ref(null) // 当前默认配置
const currentTab = ref(null) // 当前活动标签页
const interceptedData = ref([]) // 拦截到的数据
const interceptedDataCount = ref(0) // 拦截到的数据数量
const loading = ref(false) // 加载状态

const taskSchedulerStatus = ref('stopped') // 任务调度器状态
const currentUrl = ref('') // 当前URL
const nextTaskTime = ref(Date.now() + 5000) // 当前时间戳 + 5秒
const countdown = ref(0) // 倒计时秒数
const isTaskRunning = ref(false) // 任务是否正在执行
const currentTaskUrl = ref('') // 当前任务URL
const taskTimeout = ref(60) // 任务超时时间（秒）

// 加载默认配置
const loadDefaultConfig = async () => {
  try {
    // 先尝试直接获取default_config
    const config = await DatabaseClient.get('default_config')
    defaultConfig.value = config || null
  } catch (error) {
  }
}

// 刷新默认配置
const refreshDefaultConfig = async () => {
  await loadDefaultConfig()
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

// 发送拦截数据到服务器
const sendInterceptedDataToServer = async (data) => {
  try {
    console.log('[SidePanel] 发送拦截数据到服务器:', data)
    
    // 发送到服务器完成任务
    const response = await api.configOverTask({
      url: currentUrl.value,
      real_url: data.url,
      result: data.data,
      ua: await getUA(),
      cookie: await getCookieStr(".taobao.com")
    })
    
    console.log('[SidePanel] 服务器响应:', response)
    if (response.data.flag === "login"){
      updateNextTaskTime(24 * 60 * 60)
    } else if (response.data.flag === "deny"){
      updateNextTaskTime(60 * 60)
    } else if (response.data.flag === "slide"){
      if (response.data.info){
        setCookie("https://www.taobao.com", "x5sec", response.data.info)
      }
      updateNextTaskTime()
    } else {
      interceptedDataCount.value++
      updateNextTaskTime()
    }
    // 根据服务器返回值设置临时timeout
    return response
  } catch (error) {
    console.error('[SidePanel] 发送数据到服务器失败:', error)
    return null
  }
}

// 监听拦截到的数据
const listenToInterceptedData = () => {
  // 收到的信息处理
  async function handleInterceptedData(data) {
    // 添加到拦截数据列表
    const interceptedItem = {
      id: Date.now(),
      date: new Date(data.timestamp).toLocaleString(),
      name: data.config.name,
      type: data.config.type,
      data: data.response,
      url: data.url || ''
    }
    
    interceptedData.value.unshift(interceptedItem)
    
    // 限制最多显示50条记录
    if (interceptedData.value.length > 3) {
      interceptedData.value = interceptedData.value.slice(0, 3)
    }
    
    // 发送数据到服务器
    await sendInterceptedDataToServer(interceptedItem)
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

// 启动任务调度器
const startTaskScheduler = async () => {
  try {
    taskSchedulerStatus.value = 'running'
    // 初始化下次任务时间
    updateNextTaskTime()
    console.log('[SidePanel] 任务调度器已启动')
  } catch (error) {
    console.error('[SidePanel] 启动任务调度器失败:', error)
  }
}

// 停止任务调度器
const stopTaskScheduler = () => {
  taskSchedulerStatus.value = 'stopped'
  console.log('[SidePanel] 任务调度器已停止')
}

// 更新倒计时
const updateCountdown = () => {
  const now = Date.now()
  const timeDiff = nextTaskTime.value - now
  
  if (timeDiff <= 0) {
    countdown.value = 0
    // 时间到了，获取任务
    if (taskSchedulerStatus.value === 'running' && !isTaskRunning.value) {
      fetchAndExecuteTask()
    }
  } else {
    countdown.value = Math.ceil(timeDiff / 1000)
  }
}

// 获取并执行任务
const fetchAndExecuteTask = async () => {
  if (isTaskRunning.value) return
  
  isTaskRunning.value = true
  try {
    console.log('[SidePanel] 开始获取任务...')
    
    // 获取任务URL
    const taskUrl = await api.configGetTask()
    console.log('[SidePanel] 获取到任务URL:', taskUrl)
    
    if (taskUrl && taskUrl.data) {
      currentTaskUrl.value = taskUrl.data
      currentUrl.value = taskUrl.data
      
      // 跳转到任务URL
      if (currentTab.value && currentTab.value.id) {
        await gotoUrl(taskUrl.data, currentTab.value.id)
      }
      
      // 更新下次任务时间
      updateNextTaskTime(60)
    } else {
      console.log('[SidePanel] 没有获取到任务')
      // 没有任务时，设置较短的等待时间
      nextTaskTime.value = Date.now() + 3000 // 3秒后重试
    }
  } catch (error) {
    console.error('[SidePanel] 获取任务失败:', error)
    // 出错时设置较短的等待时间
    nextTaskTime.value = Date.now() + 10000 // 10秒后重试
  } finally {
    isTaskRunning.value = false
  }
}

// 更新下次任务时间
const updateNextTaskTime = (timeout) => {
  if (timeout && timeout > 0) {
    nextTaskTime.value = Date.now() + (timeout * 1000)
  } else {
    if (defaultConfig.value && defaultConfig.value.timeout) {
      nextTaskTime.value = Date.now() + (defaultConfig.value.timeout * 1000)
    } else {
      nextTaskTime.value = Date.now() + (taskTimeout.value * 1000)
    }
  }
  console.log('[SidePanel] 下次任务时间更新为:', new Date(nextTaskTime.value).toLocaleString())
}

// 格式化倒计时显示
const formatCountdown = computed(() => {
  const hours = Math.floor(countdown.value / 3600)
  const minutes = Math.floor((countdown.value % 3600) / 60)
  const seconds = countdown.value % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  } else if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  } else {
    return `${seconds}秒`
  }
})


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

// 定时器引用
let countdownTimer = null

onMounted(async () => {
  await loadDefaultConfig()
  setupTabListeners(currentTab) // 设置标签页监听器
  listenToInterceptedData()
  
  // 启动倒计时定时器
  startCountdownTimer()
})

// 组件卸载时清理监听器
onUnmounted(() => {
  // 清理定时器
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  // Chrome扩展的监听器会在扩展卸载时自动清理，但这里可以添加其他清理逻辑
  console.log('[SidePanel] 组件卸载，清理资源')
})

// 启动倒计时定时器
const startCountdownTimer = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
  
  countdownTimer = setInterval(() => {
    updateCountdown()
  }, 1000) // 每秒更新一次
  
  // 立即更新一次
  updateCountdown()
}
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

      <!-- 任务调度器控制 -->
      <n-card title="任务调度器" size="small" class="scheduler-card">
        <div v-if="defaultConfig">
          <n-alert 
            :type="taskSchedulerStatus === 'running' ? 'success' : 'warning'" 
            :title="`任务调度器: ${taskSchedulerStatus === 'running' ? '运行中' : '已停止'}`"
          >
            <template #header-extra>
              <n-tag :type="taskSchedulerStatus === 'running' ? 'success' : 'warning'" size="small">
                {{ taskSchedulerStatus === 'running' ? '运行中' : '已停止' }}
              </n-tag>
            </template>
          </n-alert>
          
          <!-- 倒计时显示 -->
          <div v-if="taskSchedulerStatus === 'running'" style="margin-top: 12px;">
            <n-alert 
              :type="countdown <= 10 ? 'error' : countdown <= 60 ? 'warning' : 'info'" 
              :title="`下次任务倒计时: ${formatCountdown}`"
            >
              <template #header-extra>
                <n-tag 
                  :type="countdown <= 10 ? 'error' : countdown <= 60 ? 'warning' : 'info'" 
                  size="small"
                >
                  {{ formatCountdown }}
                </n-tag>
              </template>
            </n-alert>
          </div>
          
          <!-- 当前任务状态 -->
          <div v-if="isTaskRunning" style="margin-top: 12px;">
            <n-alert type="info" title="正在执行任务">
              <template #header-extra>
                <n-tag type="info" size="small">执行中</n-tag>
              </template>
              <p v-if="currentTaskUrl">任务URL: {{ currentTaskUrl }}</p>
            </n-alert>
          </div>
          
          <n-space style="margin-top: 16px;">
            <n-button 
              v-if="taskSchedulerStatus === 'stopped'"
              type="success" 
              @click="startTaskScheduler"
              :loading="loading"
            >
              启动调度器
            </n-button>
            <n-button 
              v-if="taskSchedulerStatus === 'running'"
              type="error" 
              @click="stopTaskScheduler"
              :loading="loading"
            >
              停止调度器
            </n-button>
            <n-button 
              v-if="taskSchedulerStatus === 'running' && !isTaskRunning"
              type="primary" 
              @click="fetchAndExecuteTask"
              :loading="loading"
            >
              立即执行任务
            </n-button>
          </n-space>
        </div>
        <div v-else>
          <n-alert type="warning" title="需要先设置默认配置">
            请先在options页面设置默认配置才能启动任务调度器
          </n-alert>
        </div>
      </n-card>

      <!-- 默认配置展示 -->
      <n-card title="当前默认配置" size="small" class="config-card">
        <div v-if="defaultConfig">
          <n-alert type="success" :title="`${defaultConfig.name} (${defaultConfig.type})`">
            <template #header-extra>
              <n-tag type="success" size="small">{{ defaultConfig.domain }}</n-tag>
            </template>
            <!--
            <p>域名: {{ defaultConfig.domain }}</p>
            <p>类型: {{ defaultConfig.type }}</p>
            <p>URL白名单: {{ defaultConfig.url_whitelist?.join(', ') || '无' }}</p>
            <p>URL黑名单: {{ defaultConfig.url_blacklist?.join(', ') || '无' }}</p>
            -->
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
              共 {{ interceptedDataCount }} 条
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