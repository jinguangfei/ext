<script setup lang="js">
import { ref, onMounted, computed, h, toRaw } from 'vue'
import { NButton, NSpace, NInput, NCard, NTag, NAlert, NModal, NForm, NFormItem, NSelect, NDivider, NDynamicInput } from 'naive-ui'
import { DatabaseClient} from '../shared/db-utils.js'

// 响应式数据
const data = ref({}) // 存储所有数据
const configs = ref({}) // 专门存储配置数据
const searchKeyword = ref('') // 搜索关键词
const loading = ref(false)

// 配置表单数据
const configForm = ref({
  name: '',
  type: 'network',
  domain: '',
  url_whitelist: [],
  url_blacklist: [],
  body_whitelist: [],
  body_blacklist: []
})

// 模态框状态
const showModal = ref(false)
const modalTitle = ref('添加配置')
const isEditMode = ref(false)
const editingConfigKey = ref('')

// 消息状态
const messageVisible = ref(false)
const messageText = ref('')
const messageType = ref('success')

// 配置类型选项
const configTypeOptions = [
  { label: 'Network配置', value: 'network' },
  { label: 'XHR配置', value: 'xhr' },
  { label: 'HTML配置', value: 'html' }
]

// 显示消息
const showMessage = (text, type = 'success') => {
  messageText.value = text
  messageType.value = type
  messageVisible.value = true
  
  // 2秒后自动隐藏
  setTimeout(() => {
    messageVisible.value = false
    console.log('message hidden')
  }, 2000)
}

// 计算属性：过滤后的配置数据
const filteredConfigs = computed(() => {
  if (!searchKeyword.value) {
    return configs.value
  }
  
  const filtered = {}
  const keyword = searchKeyword.value.toLowerCase()
  
  for (const [key, value] of Object.entries(configs.value)) {
    if (key.toLowerCase().includes(keyword) || 
        value.name?.toLowerCase().includes(keyword) ||
        value.type?.toLowerCase().includes(keyword)) {
      filtered[key] = value
    }
  }
  
  return filtered
})

// 计算属性：配置列表
const configList = computed(() => {
  return Object.entries(filteredConfigs.value).map(([key, value]) => ({
    key,
    ...value,
    displayValue: formatConfigValue(value)
  }))
})

// 计算属性：当前默认配置
const currentDefaultConfig = computed(() => {
  return data.value.default_config || null
})

// 格式化配置值显示
const formatConfigValue = (config) => {
  return `${config.name} (${config.type}) - ${config.domain}`
}

// 格式化值显示
const formatValue = (value) => {
  if (typeof value === 'string') {
    return value  // 字符串直接显示，不加引号
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)  // 数字和布尔值转为字符串
  } else {
    return JSON.stringify(value, null, 2)  // 对象和数组使用JSON格式化
  }
}

// 初始化默认配置
const initDefaultConfigs = () => {
  const defaultConfigs = [
    {
      name: "Network配置",
      type: "network",
      domain: "baidu.com",
      url_whitelist: ["test"],
      url_blacklist: [],
      body_whitelist: [],
      body_blacklist: []
    },
    {
      name: "XHR配置",
      type: "xhr",
      domain: "baidu.com",
      url_whitelist: ["test"],
      url_blacklist: [],
      body_whitelist: [],
      body_blacklist: []
    },
    {
      name: "HTML配置",
      type: "html",
      domain: "baidu.com",
      url_whitelist: ["test"],
      url_blacklist: [],
      body_whitelist: [],
      body_blacklist: []
    }
  ]
  
  return defaultConfigs
}

onMounted(async () => {
  // 初始化DatabaseClient
  await loadData()
  await loadConfigs()
})

// 加载所有数据
const loadData = async () => {
  loading.value = true
  try {
    const result = await DatabaseClient.listAll('local')
    data.value = result.data
  } catch (error) {
    showMessage('加载数据失败: ' + error.message, 'error')
    console.error('获取数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载配置数据
const loadConfigs = async () => {
  try {
    const result = await DatabaseClient.listAll('local')
    const configData = {}
    
    // 过滤出配置数据（以配置_开头的key）
    for (const [key, value] of Object.entries(result.data)) {
      if (key.startsWith('配置_') && value && typeof value === 'object' && value.type) {
        configData[key] = value
      }
    }
    
    configs.value = configData
  } catch (error) {
    showMessage('加载配置失败: ' + error.message, 'error')
    console.error('获取配置失败:', error)
  }
}

// 打开添加配置模态框
const openAddConfigModal = () => {
  modalTitle.value = '添加配置'
  isEditMode.value = false
  editingConfigKey.value = ''
  resetConfigForm()
  showModal.value = true
}

// 重置配置表单
const resetConfigForm = () => {
  configForm.value = {
    name: '',
    type: 'network',
    domain: '',
    url_whitelist: [],
    url_blacklist: [],
    body_whitelist: [],
    body_blacklist: []
  }
}


// 保存配置
const saveConfig = async () => {
  if (!configForm.value.name.trim()) {
    showMessage('请输入配置名称', 'warning')
    return
  }
  
  if (!configForm.value.domain.trim()) {
    showMessage('请输入域名', 'warning')
    return
  }
  
  loading.value = true
  try {
    // 使用配置_${name}作为storage key
    const configKey = isEditMode.value ? editingConfigKey.value : `配置_${configForm.value.name.trim()}`
    const configCopy = JSON.parse(JSON.stringify(configForm.value))
    
    await DatabaseClient.set(configKey, configCopy)
    const action = isEditMode.value ? '修改' : '添加'
    showMessage(`配置${action}成功！`, 'success')
    
    // 关闭模态框
    showModal.value = false
    
    // 重新加载数据
    await loadData()
    await loadConfigs()
  } catch (error) {
    showMessage('保存配置失败: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 编辑配置
const editConfig = (key, config) => {
  modalTitle.value = '修改配置'
  isEditMode.value = true
  editingConfigKey.value = key
  
  // 确保数组字段正确初始化
  configForm.value = {
    ...config,
    url_whitelist: Array.isArray(config.url_whitelist) ? config.url_whitelist : [],
    url_blacklist: Array.isArray(config.url_blacklist) ? config.url_blacklist : [],
    body_whitelist: Array.isArray(config.body_whitelist) ? config.body_whitelist : [],
    body_blacklist: Array.isArray(config.body_blacklist) ? config.body_blacklist : []
  }
  showModal.value = true
}

// 删除配置
const deleteConfig = async (key) => {
  loading.value = true
  try {
    await DatabaseClient.delete(key)
    showMessage(`删除配置 ${key} 成功！`, 'success')
    await loadData()
    await loadConfigs()
  } catch (error) {
    showMessage('删除配置失败: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 设置默认配置
const setDefaultConfig = async (key, config) => {
  loading.value = true
  try {
    // 深拷贝配置对象，确保是纯对象
    const configCopy = JSON.parse(JSON.stringify(config))
    await DatabaseClient.set('default_config', configCopy)
    showMessage(`配置 "${config.name}" 已设为默认配置`, 'success')
    await loadData()
  } catch (error) {
    showMessage('设置默认配置失败: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 初始化默认配置
const initDefaultConfigsAction = async () => {
  loading.value = true
  try {
    const defaultConfigs = initDefaultConfigs()
    let successCount = 0
    
    for (const config of defaultConfigs) {
      // 使用配置_${name}作为storage key
      const configKey = `配置_${config.name}`
      await DatabaseClient.set(configKey, config)
      successCount++
    }
    
    showMessage(`默认配置初始化完成 (${successCount}/3)`, 'success')
    await loadData()
    await loadConfigs()
  } catch (error) {
    showMessage('初始化默认配置失败: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 清空所有配置
const clearAllConfigs = async () => {
  loading.value = true
  try {
    // 只删除配置相关的数据
    for (const key of Object.keys(configs.value)) {
      await DatabaseClient.delete(key)
    }
    showMessage('清空所有配置成功！', 'success')
    await loadData()
    await loadConfigs()
  } catch (error) {
    showMessage('清空配置失败: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 搜索配置
const searchConfigs = async () => {
  if (!searchKeyword.value.trim()) {
    await loadConfigs()
    return
  }
  
  loading.value = true
  try {
    const result = await DatabaseClient.listAll('local', searchKeyword.value)
    const configData = {}
    
    // 过滤出配置数据（以配置_开头的key）
    for (const [key, value] of Object.entries(result.data)) {
      if (key.startsWith('配置_') && value && typeof value === 'object' && value.type) {
        configData[key] = value
      }
    }
    
    configs.value = configData
    showMessage(`搜索完成，找到 ${Object.keys(configData).length} 条匹配配置`, 'info')
  } catch (error) {
    showMessage('搜索配置失败: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = async () => {
  await loadData()
  await loadConfigs()
}

// 配置表格列定义
const configColumns = [
  {
    title: '配置名称',
    key: 'name',
    width: 150,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '类型',
    key: 'type',
    width: 100,
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
    title: '域名',
    key: 'domain',
    width: 120,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row) => {
      const buttons = []
      
      // 编辑按钮
      buttons.push(
        h(NButton, {
          size: 'small',
          type: 'primary',
          onClick: () => editConfig(row.key, row)
        }, { default: () => '编辑' })
      )
      
      // 删除按钮
      buttons.push(
        h(NButton, {
          size: 'small',
          type: 'error',
          onClick: () => deleteConfig(row.key)
        }, { default: () => '删除' })
      )
      
      // 设为默认按钮
      buttons.push(
        h(NButton, {
          size: 'small',
          type: 'success',
          onClick: () => setDefaultConfig(row.key, row)
        }, { default: () => '设为默认' })
      )
      
      return h('n-space', { size: 'small' }, buttons)
    }
  }
]
</script>

<template>
  <n-config-provider>
    <div class="options-container">
      <!-- 页面标题 -->
      <n-card size="small" class="title-card">
        <h2>配置管理中心</h2>
        <p>管理所有观察配置，设置默认配置</p>
      </n-card>

      <!-- 当前默认配置显示 -->
      <n-card title="当前默认配置" size="small" class="default-config-card" v-if="currentDefaultConfig">
        <n-alert type="info" :title="`当前默认配置: ${currentDefaultConfig.name} (${currentDefaultConfig.type})`">
          <template #header-extra>
            <n-tag type="success" size="small">已设置</n-tag>
          </template>
        </n-alert>
      </n-card>

      <!-- 搜索区域 -->
      <n-card title="搜索配置" size="small" class="search-card">
        <n-space>
          <n-input
            v-model:value="searchKeyword"
            placeholder="输入配置名称、类型或域名搜索..."
            clearable
            style="width: 300px"
          />
          <n-button 
            type="primary" 
            @click="searchConfigs"
            :loading="loading"
          >
            搜索
          </n-button>
          <n-button 
            @click="refreshData"
            :loading="loading"
          >
            刷新
          </n-button>
        </n-space>
      </n-card>

      <!-- 配置管理操作区域 -->
      <n-card title="配置管理" size="small" class="config-management-card">
        <n-space>
          <n-button 
            type="primary" 
            @click="openAddConfigModal"
            :loading="loading"
          >
            添加配置
          </n-button>
          <n-button 
            type="info" 
            @click="initDefaultConfigsAction"
            :loading="loading"
          >
            初始化默认配置
          </n-button>
          <n-button 
            type="error" 
            @click="clearAllConfigs"
            :loading="loading"
          >
            清空所有配置
          </n-button>
        </n-space>
      </n-card>

      <!-- 配置列表展示区域 -->
      <n-card title="配置列表" size="small" class="config-list-card">
        <template #header-extra>
          <n-space>
            <n-tag type="info" size="small">
              共 {{ configList.length }} 条配置
            </n-tag>
          </n-space>
        </template>

        <!-- 配置表格 -->
        <n-data-table
          :columns="configColumns"
          :data="configList"
          :loading="loading"
          :pagination="false"
          size="small"
          max-height="500"
        />
      </n-card>

    <!-- 消息提示 -->
    <div v-if="messageVisible" class="message-container">
      <n-alert 
        :type="messageType"
        :title="messageText"
        closable
        @close="messageVisible = false"
      />
    </div>

    <!-- 添加/修改配置模态框 -->
    <n-modal
      v-model:show="showModal"
      :title="modalTitle"
      preset="dialog"
      :style="{ width: '700px' }"
    >
      <n-form
        ref="configFormRef"
        :model="configForm"
        label-placement="left"
        label-width="100px"
      >
        <n-form-item label="配置名称" path="name">
          <n-input
            v-model:value="configForm.name"
            placeholder="输入配置名称..."
          />
        </n-form-item>
        
        <n-form-item label="配置类型" path="type">
          <n-select
            v-model:value="configForm.type"
            :options="configTypeOptions"
            placeholder="选择配置类型..."
          />
        </n-form-item>
        
        <n-form-item label="域名" path="domain">
          <n-input
            v-model:value="configForm.domain"
            placeholder="输入目标域名..."
          />
        </n-form-item>
        
        <n-divider title-placement="left">URL 过滤规则</n-divider>
        
        <n-form-item label="URL白名单" path="url_whitelist">
          <n-dynamic-input
            v-model:value="configForm.url_whitelist"
            preset="input"
            placeholder="输入URL白名单项..."
            :min="0"
            :max="20"
          />
        </n-form-item>
        
        <n-form-item label="URL黑名单" path="url_blacklist">
          <n-dynamic-input
            v-model:value="configForm.url_blacklist"
            preset="input"
            placeholder="输入URL黑名单项..."
            :min="0"
            :max="20"
          />
        </n-form-item>
        
        <n-divider title-placement="left">Body 过滤规则</n-divider>
        
        <n-form-item label="Body白名单" path="body_whitelist">
          <n-dynamic-input
            v-model:value="configForm.body_whitelist"
            preset="input"
            placeholder="输入Body白名单项..."
            :min="0"
            :max="20"
          />
        </n-form-item>
        
        <n-form-item label="Body黑名单" path="body_blacklist">
          <n-dynamic-input
            v-model:value="configForm.body_blacklist"
            preset="input"
            placeholder="输入Body黑名单项..."
            :min="0"
            :max="20"
          />
        </n-form-item>
      </n-form>
      
      <template #action>
        <n-space>
          <n-button @click="showModal = false">取消</n-button>
          <n-button 
            type="primary" 
            @click="saveConfig"
            :loading="loading"
          >
            {{ isEditMode ? '保存修改' : '添加配置' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>

    </div>
  </n-config-provider>
</template>

<style scoped>
.options-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  overflow-x: auto;
}

</style>
