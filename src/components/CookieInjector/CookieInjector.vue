<script setup lang="js">
import { ref, watch } from 'vue'
import { NButton, NSpace, NCard, NInput, NAlert, NSelect, NCollapse, NCollapseItem, NForm, NFormItem } from 'naive-ui'
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
const domains = ref([...props.defaultDomains]) // 可编辑的域名列表
const selectedDomains = ref(domains.value.map(item => item.value)) // 默认选中所有域名
const loading = ref(false) // 加载状态
const lastResult = ref(null) // 最后一次操作结果

// 新增域名表单
const newDomainLabel = ref('')
const newDomainValue = ref('')
const showDomainEditor = ref(false)

// 监听 domains 变化，更新 selectedDomains
watch(domains, (newDomains) => {
  // 只保留仍然存在的域名选择
  selectedDomains.value = selectedDomains.value.filter(value => 
    newDomains.some(domain => domain.value === value)
  )
}, { deep: true })

// 添加新域名
const addDomain = () => {
  if (!newDomainLabel.value.trim() || !newDomainValue.value.trim()) {
    lastResult.value = {
      type: 'error',
      message: '标签和域名值都不能为空'
    }
    return
  }
  
  // 检查是否已存在相同的 value
  if (domains.value.some(d => d.value === newDomainValue.value.trim())) {
    lastResult.value = {
      type: 'error',
      message: '该域名已存在'
    }
    return
  }
  
  domains.value.push({
    label: newDomainLabel.value.trim(),
    value: newDomainValue.value.trim()
  })
  
  newDomainLabel.value = ''
  newDomainValue.value = ''
  showDomainEditor.value = false
  
  lastResult.value = {
    type: 'success',
    message: '域名添加成功'
  }
}

// 删除域名
const removeDomain = (index) => {
  domains.value.splice(index, 1)
  lastResult.value = {
    type: 'success',
    message: '域名删除成功'
  }
}

// 编辑域名
const editingIndex = ref(-1)
const editingLabel = ref('')
const editingValue = ref('')

const startEdit = (index) => {
  editingIndex.value = index
  editingLabel.value = domains.value[index].label
  editingValue.value = domains.value[index].value
}

const saveEdit = (index) => {
  if (!editingLabel.value.trim() || !editingValue.value.trim()) {
    lastResult.value = {
      type: 'error',
      message: '标签和域名值都不能为空'
    }
    return
  }
  
  // 检查是否与其他域名冲突
  const conflictIndex = domains.value.findIndex((d, i) => 
    i !== index && d.value === editingValue.value.trim()
  )
  if (conflictIndex !== -1) {
    lastResult.value = {
      type: 'error',
      message: '该域名已存在'
    }
    return
  }
  
  domains.value[index] = {
    label: editingLabel.value.trim(),
    value: editingValue.value.trim()
  }
  
  editingIndex.value = -1
  editingLabel.value = ''
  editingValue.value = ''
  
  lastResult.value = {
    type: 'success',
    message: '域名更新成功'
  }
}

const cancelEdit = () => {
  editingIndex.value = -1
  editingLabel.value = ''
  editingValue.value = ''
}

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
  domains.value = [...props.defaultDomains]
  selectedDomains.value = domains.value.map(item => item.value)
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
      <!-- 域名管理 -->
      <n-collapse>
        <n-collapse-item title="域名管理" name="domain-manager">
          <n-space vertical>
            <!-- 域名列表 -->
            <div v-for="(domain, index) in domains" :key="index" style="padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 8px;">
              <n-space v-if="editingIndex !== index" justify="space-between" align="center">
                <div>
                  <strong>{{ domain.label }}</strong>
                  <span style="color: #999; margin-left: 8px;">{{ domain.value }}</span>
                </div>
                <n-space>
                  <n-button size="small" @click="startEdit(index)">编辑</n-button>
                  <n-button size="small" type="error" @click="removeDomain(index)">删除</n-button>
                </n-space>
              </n-space>
              <n-space v-else vertical>
                <n-form-item label="标签">
                  <n-input v-model:value="editingLabel" placeholder="输入标签" />
                </n-form-item>
                <n-form-item label="域名">
                  <n-input v-model:value="editingValue" placeholder="输入域名URL" />
                </n-form-item>
                <n-space>
                  <n-button size="small" type="primary" @click="saveEdit(index)">保存</n-button>
                  <n-button size="small" @click="cancelEdit">取消</n-button>
                </n-space>
              </n-space>
            </div>
            
            <!-- 添加新域名 -->
            <n-button v-if="!showDomainEditor" type="primary" dashed @click="showDomainEditor = true" style="width: 100%;">
              添加新域名
            </n-button>
            
            <n-form v-else style="padding: 12px; border: 1px solid #e0e0e0; border-radius: 4px;">
              <n-form-item label="标签">
                <n-input v-model:value="newDomainLabel" placeholder="输入标签，如: 淘宝" />
              </n-form-item>
              <n-form-item label="域名">
                <n-input v-model:value="newDomainValue" placeholder="输入域名URL，如: https://www.taobao.com" />
              </n-form-item>
              <n-space>
                <n-button type="primary" @click="addDomain">添加</n-button>
                <n-button @click="showDomainEditor = false">取消</n-button>
              </n-space>
            </n-form>
          </n-space>
        </n-collapse-item>
      </n-collapse>
      
      <!-- 域名选择 -->
      <n-select
        v-model:value="selectedDomains"
        :options="domains"
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
