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
import { NSelect, NButton, NSpace, NIcon, NEmpty } from 'naive-ui'

// Props
const props = defineProps({
  // 当前选中的标签页ID
  modelValue: {
    type: [Number, String],
    default: null
  },
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
const emit = defineEmits(['update:modelValue', 'tab-change', 'refresh'])


// 响应式数据
const tabs = ref([])
const loading = ref(false)
const selectedTabId = ref(props.modelValue)

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
    emit('update:modelValue', tabId)
    emit('tab-change', selectedTab)
  }
}

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== selectedTabId.value) {
    selectedTabId.value = newValue
  }
}, { immediate: true })

// 组件挂载时获取标签页
onMounted(async () => {
  try {
    await getAllTabs()
    
    // 只在必要时监听标签页变化
    if (chrome.tabs) {
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
    
    // 监听debugger事件来更新特定tab的debug状态
    if (chrome.debugger) {
      console.log('[TabSelector] chrome.debugger', chrome.debugger)
      console.log('[TabSelector] chrome.debugger', chrome.debugger.onAttach)
      console.log('[TabSelector] chrome.debugger', chrome.debugger.onDetach)

      chrome.debugger.onDetach.addListener(async (source) => {
        const tabIndex = tabs.value.findIndex(tab => tab.id === source.tabId)
        if (tabIndex !== -1) {
          tabs.value[tabIndex].isDebug = false
          console.log('[TabSelector] 标签页停止调试:', source.tabId)
        }
      })
    }
  } catch (error) {
    console.error('[TabSelector] 组件挂载失败:', error)
  }
})
</script>

<style scoped>
.tab-select {
  width: 100%;
}
</style>
