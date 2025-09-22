<template>
      <n-select
          v-model:value="selectedTabId"
          :options="tabOptions"
          :loading="loading"
          placeholder="选择标签页"
          clearable
          filterable
          @update:value="handleTabChange"
          class="tab-select"
      >
      </n-select>
      
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick, markRaw } from 'vue'
import { NSelect, NButton, NSpace, NIcon, NEmpty, NTag } from 'naive-ui'

// Props
const props = defineProps({
  // 自定义过滤函数
  filterFunction: {
    type: Function,
    default: null
  },
  // 最大显示数量
  maxItems: {
    type: Number,
    default: 50
  }
})

// Emits
const emit = defineEmits(['tab-change', 'update:tabs'])

// 响应式数据
const tabs = ref([])
const selectedTabId = ref(null)
const loading = ref(false)

// 计算属性：格式化标签页选项
const tabOptions = computed(() => {
  if (!Array.isArray(tabs.value)) {
    return []
  }
  
  return tabs.value.map(tab => {
    // 区分debug状态
    const debugStatus = tab.isDebug ? '🔴' : '🟢'
    return {
      label: `${debugStatus} ${tab.title || '无标题'}`,
      value: tab.id
    }
  })
})

// 计算属性：当前选中的标签页
const selectedTab = computed(() => {
  return tabs.value.find(tab => tab.id === selectedTabId.value)
})

// 获取正在调试的标签页ID集合
const getDebugTabIds = async () => {
  try {
    const targets = await new Promise((resolve, reject) => {
      chrome.debugger.getTargets((targets) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(targets)
        }
      })
    })
    console.log('[TabSelector] 获取调试标签页:', targets)
    
    const debugTabIds = new Set()
    targets.forEach(target => {
      if (target.type === 'page' && target.tabId && target.attached === true) {
        debugTabIds.add(target.tabId)
      }
    })
    
    return debugTabIds
  } catch (error) {
    console.error('获取调试标签页失败:', error)
    return new Set()
  }
}

// 获取所有标签页并添加debug状态属性
const getAllTabs = async () => {
  try {
    loading.value = true
    
    // 并行获取标签页和调试状态
    const [chromeTabs, debugTabIds] = await Promise.all([
      new Promise((resolve, reject) => {
        chrome.tabs.query({}, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            console.log('[TabSelector] 获取标签页:', tabs)
            resolve(tabs)
          }
        })
      }),
      getDebugTabIds()
    ])
    
    console.log('[TabSelector] 获取标签页:', chromeTabs)
    console.log('[TabSelector] 正在调试的标签页:', Array.from(debugTabIds))
    
    // 为每个标签页添加debug状态属性
    const tabsWithDebugStatus = chromeTabs.map(tab => ({
      ...tab,
      isDebug: debugTabIds.has(tab.id)
    }))
    
    // 过滤标签页
    let filteredTabs = tabsWithDebugStatus.filter(tab => {
      return true
    })
    
    tabs.value = filteredTabs
    
  } catch (error) {
    console.error('获取标签页失败:', error)
    tabs.value = []
  } finally {
    loading.value = false
  }
}

// 处理标签页选择变化
const handleTabChange = (tabId) => {
  const selectedTab = tabs.value.find(tab => tab.id === tabId)
  if (selectedTab) {
    emit('tab-change', selectedTab)
  }
}

// 切换单个tab的debug状态
const tabAttach = async (tabId) => {
  try {
    const tab = tabs.value.find(t => t.id === tabId)
    if (!tab) {
      console.error('[TabSelector] 未找到标签页:', tabId)
      return
    }

    // 检查URL是否有效
    if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
      console.info('[TabSelector] 标签页URL无效，无法调试:', tab.url)
      return
    }

    if (tab.isDebug) {
      // 停止调试
      await chrome.debugger.detach({ tabId })
      console.log('[TabSelector] 已停止调试标签页:', tabId)
    } else {
      // 开始调试
      await chrome.debugger.attach({ tabId }, '1.3')
      await chrome.debugger.sendCommand({ tabId }, 'Network.enable')
      console.log('[TabSelector] 已开始调试标签页:', tabId)
    }

    // 更新本地状态
    tab.isDebug = !tab.isDebug
    
  } catch (error) {
    console.error('[TabSelector] 切换debug状态失败:', error)
  }
}
const tabDetach = async (tabId) => {
  try {
    const tab = tabs.value.find(t => t.id === tabId)
    if (!tab) {
      console.error('[TabSelector] 未找到标签页:', tabId)
      return
    }
    await chrome.debugger.detach({ tabId })
    console.log('[TabSelector] 已停止调试标签页:', tabId)
    tab.isDebug = false
  } catch (error) {
    console.error('[TabSelector] 停止调试标签页失败:', error)
  }
}

// 监听tabs变化并同步到父组件
watch(tabs, (newTabs) => {
  emit('update:tabs', newTabs)
}, { deep: true, immediate: true })

function listenTabChange() {
   // 只在必要时监听标签页变化
   if (chrome.tabs) {
      selectedTabId.value = tabs.value.find(tab => tab.active)?.id
      chrome.tabs.onActivated.addListener((activeInfo) => {
        selectedTabId.value = tabs.value.find(tab => tab.id === activeInfo.tabId)?.id
        tabs.value.map(tab => {
          if (tab.id === activeInfo.tabId) {
            tab.active = true
          } else if (tab.active) {
            tab.active = false
          }
        })
      })

      chrome.tabs.onRemoved.addListener((tabId) => {
        // 只移除对应的tab，不刷新整个列表
        const index = tabs.value.findIndex(tab => tab.id === tabId)
        if (index !== -1) {
          tabs.value.splice(index, 1)
        }
      })
      
      chrome.tabs.onCreated.addListener(async (tab) => {
        // 只添加新tab，不刷新整个列表
        try {
          tabs.value.push(tab)
        } catch (error) {
          console.error('添加新标签页失败:', error)
        }
      })
      
      chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, updatedTab) => {
        // 更新现有tab的信息（标题、URL等）
        try {
          const tabIndex = tabs.value.findIndex(tab => tab.id === tabId)
          if (tabIndex !== -1) {
            // 只更新变化的字段，避免不必要的重新渲染
            if (changeInfo.title) {
              tabs.value[tabIndex].title = changeInfo.title
            }
            if (changeInfo.url) {
              tabs.value[tabIndex].url = changeInfo.url
            }
            if (changeInfo.status) {
              tabs.value[tabIndex].status = changeInfo.status
            }
            console.log('[TabSelector] 更新标签页信息:', tabId, changeInfo)
          }
        } catch (error) {
          console.error('更新标签页信息失败:', error)
        }
      })
    }
}

function listenDebuggerEvent() {
  // 监听debugger事件来更新特定tab的debug状态
  if (chrome.debugger) {
    
    // 监听debugger分离事件
    chrome.debugger.onDetach.addListener(async (source) => {
      const tabIndex = tabs.value.findIndex(tab => tab.id === source.tabId)
      if (tabIndex !== -1) {
        tabs.value[tabIndex].isDebug = false
        console.log('[TabSelector] 标签页停止调试:', source.tabId)
      }
    })
  }
}


// 组件挂载时获取标签页
onMounted(async () => {
  try {
    await getAllTabs()
    listenTabChange() // 监听标签页变化
    listenDebuggerEvent() // 监听debugger事件
  } catch (error) {
    console.error('[TabSelector] 组件挂载失败:', error)
  }
})

defineExpose({
  tabAttach,
  tabDetach
})

</script>

<style scoped>
</style>
