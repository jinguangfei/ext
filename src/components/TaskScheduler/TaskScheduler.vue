<script setup lang="js">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { NButton, NSpace, NCard, NTag, NAlert } from 'naive-ui'
import { getCurrentTab, gotoUrl } from '../../shared/chrome_utils.js'
import { getUA, getCookieStr, setCookie } from '../../shared/chrome_utils.js'
import { api } from '../../api/index.js'
import { Monitor } from '../../shared/monitor.js'
import DataDisplay from '../DataDisplay/DataDisplay.vue'


// 响应式数据
const taskSchedulerStatus = ref('stopped') // 任务调度器状态
const nextTaskTime = ref(Date.now() + 5000) // 当前时间戳 + 5秒
const countdown = ref(0) // 倒计时秒数
const isTaskRunning = ref(false) // 任务是否正在执行
const workerInfo = ref({}) // 工人信息
const taskInfo = ref({}) // 任务信息
const taskTimeout = ref(60) // 任务超时时间（秒）
const loading = ref(false) // 加载状态

const interceptedData = ref(null) // 拦截到的数据
const interceptedDataList = ref([]) // 拦截到的数据列表
const interceptedDataCount = ref(0) // 拦截到的数据数量

const props = defineProps({
  defaultConfig: {
    type: Object,
    default: null
  },
  currentTab: {
    type: Object,
    default: null
  },
  isAbleConfig: {
    type: Boolean,
    default: false
  }
})

// 内部状态管理
const currentConfig = ref(props.defaultConfig) // 当前配置
const currentTab = ref(props.currentTab) // 当前标签页
const isAbleConfig = ref(props.isAbleConfig) // 配置是否可用状态

// 监听 props 变化，同步更新内部状态
watch(() => props.defaultConfig, (newVal) => {
  currentConfig.value = newVal
}, { immediate: true })

watch(() => props.currentTab, (newVal) => {
  currentTab.value = newVal
}, { immediate: true })

watch(() => props.isAbleConfig, (newVal) => {
  isAbleConfig.value = newVal
}, { immediate: true })

// 定时器引用
let countdownTimer = null

let monitor = null

const initMonitor = () => {
  try {
    if (!monitor) {
        monitor = new Monitor(currentConfig, interceptedData)
        monitor.init()
    }
  } catch (error) {
    console.error('[TaskScheduler] 初始化monitor失败:', error)
  }
}


// 监听拦截数据变化
const watchInterceptedData = () => {
  watch(interceptedData, (newData) => {
    if (newData && isAbleConfig.value) {
      console.log('[TaskScheduler] 检测到拦截数据:', newData)
      
      // 添加到拦截数据列表
      const interceptedItem = {
        id: Date.now(),
        date: new Date(newData.timestamp).toLocaleString(),
        name: newData.config.name,
        type: newData.config.type,
        data: newData.response,
        url: newData.url || ''
      }
      
      interceptedDataList.value.unshift(interceptedItem)
      
      // 限制最多显示10条记录
      if (interceptedDataList.value.length > 10) {
        interceptedDataList.value = interceptedDataList.value.slice(0, 10)
      }
      
      // 增加拦截数据计数
      interceptedDataCount.value++
      
      // 发送拦截数据到服务器
      sendInterceptedDataToServer(interceptedItem)
    }
  }, { deep: true })
}

// 清空拦截数据
const clearInterceptedData = () => {
  interceptedDataCount.value = 0
  interceptedDataList.value = []
}

// 发送拦截数据到服务器
const sendInterceptedDataToServer = async (data) => {
  try {
    console.log('[TaskScheduler] 发送拦截数据到服务器:', data)
    workerInfo.value = {
      cookie: await getCookieStr(".taobao.com"),
    }
    
    // 发送到服务器完成任务
    const response = await api.overTask({
      task_info: taskInfo.value,
      worker_info: workerInfo.value,
      real_url: data.url,
      result: data.data,
      ua: await getUA(),
    })
    
    console.log('[TaskScheduler] 服务器响应:', response)
    if (response.data.flag === "login"){
      updateNextTaskTime(24 * 60 * 60)
    } else if (response.data.flag === "deny"){
      updateNextTaskTime(60 * 60)
    } else if (response.data.flag === "slide"){
      if (response.data.info){
        setCookie("https://www.taobao.com", "x5sec", response.data.info)
        setCookie("https://www.tmall.com", "x5sec", response.data.info)
      }
      updateNextTaskTime()
    } else {
      updateNextTaskTime()
    }
    
    return response
  } catch (error) {
    console.info('[TaskScheduler] 发送数据到服务器失败:', error)
    return null
  }
}

// 启动任务调度器
const startTaskScheduler = async () => {
  try {
    loading.value = true
    
    // 检查配置是否可用
    if (!isAbleConfig.value) {
      console.log('[TaskScheduler] 配置不可用，无法启动任务调度器')
      return
    }
    
    taskSchedulerStatus.value = 'running'
    
    // 启动监听拦截数据
    watchInterceptedData()
    
    // 初始化下次任务时间
    updateNextTaskTime(3)
    console.log('[TaskScheduler] 任务调度器已启动')
  } catch (error) {
    console.error('[TaskScheduler] 启动任务调度器失败:', error)
  } finally {
    loading.value = false
  }
}

// 停止任务调度器
const stopTaskScheduler = () => {
  taskSchedulerStatus.value = 'stopped'
  console.log('[TaskScheduler] 任务调度器已停止')
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
  
  // 检查配置是否可用
  if (!isAbleConfig.value) {
    console.log('[TaskScheduler] 配置不可用，无法获取任务')
    return
  }
  
  isTaskRunning.value = true
  loading.value = true
  
  try {
    console.log('[TaskScheduler] 开始获取任务...')
    workerInfo.value = {
      cookie: await getCookieStr(".taobao.com"),
    }
    console.log('[TaskScheduler] 获取任务工人信息:', workerInfo.value)
    
    // 获取任务URL
    const workerTaskInfo = (await api.getTask(workerInfo.value)).data
    const workerTaskInfoTest = {
      task_info: {
        "item_id":"834550783063",
        "task_type":"LT_TAOBAO",
      },
      short_url: "https://e.tb.cn/h.SXH6trIriZcKCun"
    }
    console.log('[TaskScheduler] 获取到任务URL:', workerTaskInfo)
    
    if (workerTaskInfo && workerTaskInfo.short_url) {
      taskInfo.value = workerTaskInfo.task_info

      // 跳转到任务URL
      if (currentTab.value && currentTab.value.id) {
        await gotoUrl(workerTaskInfo.short_url, currentTab.value.id)
      }
      
      // 更新下次任务时间
      updateNextTaskTime(60)
      
    } else {
      console.log('[TaskScheduler] 没有获取到任务 {{workerTaskInfo.flag}}')
      // 没有任务时，设置较短的等待时间
      nextTaskTime.value = Date.now() + 3000 // 3秒后重试
    }
  } catch (error) {
    console.error('[TaskScheduler] 获取任务失败:', error)
    // 出错时设置较短的等待时间
    nextTaskTime.value = Date.now() + 10000 // 10秒后重试
    // emit('task-error', error) - 已移除，不需要同步
  } finally {
    isTaskRunning.value = false
    loading.value = false
  }
}

// 更新下次任务时间
const updateNextTaskTime = (timeout) => {
  try {
    if (timeout && timeout > 0) {
      nextTaskTime.value = Date.now() + (timeout * 1000)
    } else {
      if (currentConfig.value && currentConfig.value.timeout) {
        nextTaskTime.value = Date.now() + (currentConfig.value.timeout * 1000)
      } else {
        nextTaskTime.value = Date.now() + (taskTimeout.value * 1000)
      }
    }
    console.log('[TaskScheduler] 下次任务时间更新为:', new Date(nextTaskTime.value).toLocaleString())
  } catch (error) {
    console.error('[TaskScheduler] 更新下次任务时间失败:', error)
    // 设置默认超时时间
    nextTaskTime.value = Date.now() + (taskTimeout.value * 1000)
  }
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

onMounted(() => {
  // 启动倒计时定时器
  initMonitor()
  startCountdownTimer()
})

// 组件卸载时清理监听器
onUnmounted(() => {
  // 清理定时器
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  console.log('[TaskScheduler] 组件卸载，清理资源')
})
</script>

<template>
  <n-card title="任务调度器" size="small" class="scheduler-card">
    <div v-if="currentConfig">
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
      
      <!-- 配置状态显示 -->
      <div style="margin-top: 12px;">
        <n-alert 
          :type="isAbleConfig ? 'success' : 'error'" 
          :title="`配置状态: ${isAbleConfig ? '可用' : '不可用'}`"
        >
          <template #header-extra>
            <n-tag :type="isAbleConfig ? 'success' : 'error'" size="small">
              {{ isAbleConfig ? '可用' : '不可用' }}
            </n-tag>
          </template>
        </n-alert>
      </div>
      
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
          <p v-if="taskInfo">任务INFO: {{ taskInfo.item_id }} {{ taskInfo.task_type }}</p>
        </n-alert>
      </div>
      
      <n-space style="margin-top: 16px;">
        <n-button 
          v-if="taskSchedulerStatus === 'stopped'"
          type="success" 
          @click="startTaskScheduler"
          :loading="loading"
          :disabled="!isAbleConfig"
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
          :disabled="!isAbleConfig"
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
    
    <!-- 拦截数据展示 -->
    <DataDisplay 
      :data="interceptedDataList"
      :count="interceptedDataCount"
      @clear="clearInterceptedData"
    />
  </n-card>
</template>

<style scoped>
.scheduler-card {
  margin-bottom: 16px;
}
</style>
