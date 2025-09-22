<script setup lang="js">
import { ref } from 'vue'
import { NButton, NSpace, NCard, NInput, NAlert, NSelect } from 'naive-ui'
import { setCookieStr, clearAll } from '../../shared/chrome_utils.js'

// 定义props
const props = defineProps({
  title: {
    type: String,
    default: 'Cookie注入'
  },
  defaultDomains: {
    type: Array,
    default: () => [
      { label: '淘宝', value: 'https://www.taobao.com' },
      { label: '天猫', value: 'https://www.tmall.com' }
    ]
  },
  defaultCookie: {
    type: String,
    default: 'x5sec=test_value; session_id=123456'
  }
})

// 定义emits
const emit = defineEmits(['inject-success', 'inject-error', 'clear-success', 'clear-error'])

// 响应式数据
const cookieInput = ref(props.defaultCookie) // Cookie字符串输入
const selectedDomains = ref(props.defaultDomains.map(item => item.value)) // 默认选中所有域名
const loading = ref(false) // 加载状态
const lastResult = ref(null) // 最后一次操作结果

// 注入Cookie
const handleInjectCookie = async () => {
  if (!cookieInput.value.trim()) {
    lastResult.value = {
      type: 'error',
      message: 'Cookie字符串不能为空'
    }
    emit('inject-error', 'Cookie字符串不能为空')
    return
  }
  
  if (!selectedDomains.value || selectedDomains.value.length === 0) {
    lastResult.value = {
      type: 'error',
      message: '请至少选择一个域名'
    }
    emit('inject-error', '请至少选择一个域名')
    return
  }
  
  loading.value = true
  lastResult.value = null
  
  try {
    // 为每个选中的域名注入Cookie
    const results = []
    for (const domain of selectedDomains.value) {
      setCookieStr(domain, cookieInput.value)
      results.push(domain)
    }
    
    const domainsText = results.join(', ')
    lastResult.value = {
      type: 'success',
      message: `Cookie注入成功: 到域名: ${domainsText}`
    }
    emit('inject-success', {
      domains: selectedDomains.value,
      cookie: cookieInput.value
    })
    console.log('[CookieInjector] 注入Cookie成功:', cookieInput.value, '到域名:', domainsText)
  } catch (error) {
    lastResult.value = {
      type: 'error',
      message: `注入Cookie失败: ${error.message}`
    }
    emit('inject-error', error.message)
    console.error('[CookieInjector] 注入Cookie失败:', error)
  } finally {
    loading.value = false
  }
}


// 重置为默认值
const resetToDefaults = () => {
  cookieInput.value = props.defaultCookie
  selectedDomains.value = props.defaultDomains.map(item => item.value)
  lastResult.value = null
}

// 清除所有数据
const handleClearAll = () => {
  try {
    clearAll()
    lastResult.value = {
      type: 'success',
      message: '清除所有数据成功'
    }
    emit('clear-success')
    console.log('[CookieInjector] 清除所有数据成功')
  } catch (error) {
    lastResult.value = {
      type: 'error',
      message: `清除数据失败: ${error.message}`
    }
    emit('clear-error', error.message)
    console.error('[CookieInjector] 清除数据失败:', error)
  }
}
</script>

<template>
  <n-card :title="title" size="small" class="cookie-injector-card">
    <n-space vertical>
      <!-- 域名选择 -->
      <n-select
        v-model:value="selectedDomains"
        :options="defaultDomains"
        placeholder="选择目标域名（可多选）"
        multiple
        :disabled="loading"
      />
      
      <!-- Cookie字符串输入 -->
      <n-input
        v-model:value="cookieInput"
        placeholder="输入Cookie字符串，如: name=value; name2=value2"
        type="textarea"
        :rows="3"
        clearable
        :disabled="loading"
      />
    
      <!-- 操作结果提示 -->
      <n-alert 
        v-if="lastResult"
        :type="lastResult.type"
        :title="lastResult.message"
        closable
        @close="lastResult = null"
      />
      
      <!-- 操作按钮 -->
      <n-space>
        <n-button 
          type="info" 
          @click="handleInjectCookie"
          :loading="loading"
          style="flex: 1;"
        >
          注入
        </n-button>
        <n-button 
          @click="resetToDefaults"
          :disabled="loading"
        >
          重置
        </n-button>
        <!-- 清除所有数据按钮 -->
        <n-button 
          type="error" 
          @click="handleClearAll"
          :disabled="loading"
        >
          清除数据
        </n-button>
      </n-space>
    </n-space>
  </n-card>
</template>

<style scoped>
</style>
