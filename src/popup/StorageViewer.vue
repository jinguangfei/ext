<template>
  <n-config-provider>
    <main>
      <n-card title="数据库存储查看器" style="margin: 16px;">
        <n-space vertical>
          <n-space>
            <n-button @click="refreshData" type="primary" :loading="loading">
              刷新数据
            </n-button>
            <n-button @click="viewAllStorage" type="info">
              查看所有存储
            </n-button>
          </n-space>

          <n-divider />

          <n-space>
            <n-select
              v-model:value="selectedStorage"
              :options="storageOptions"
              placeholder="选择存储类型"
              style="width: 200px"
            />
            <n-button @click="viewSelectedStorage" :disabled="!selectedStorage">
              查看选中存储
            </n-button>
          </n-space>

          <n-divider />

          <!-- 数据显示区域 -->
          <div v-if="storageData">
            <n-h3>{{ selectedStorage || '所有存储' }} 数据</n-h3>
            <n-alert type="info" style="margin-bottom: 16px;">
              共 {{ storageData.count || '0' }} 项数据
            </n-alert>
            
            <n-card v-if="Object.keys(storageData.data || {}).length > 0">
              <n-space vertical>
                <div v-for="(value, key) in storageData.data" :key="key" class="data-item">
                  <n-space justify="space-between" align="center">
                    <n-tag type="primary">{{ key }}</n-tag>
                    <n-space>
                      <n-button size="small" @click="copyValue(value)">
                        复制值
                      </n-button>
                      <n-button size="small" type="error" @click="deleteItem(key)">
                        删除
                      </n-button>
                    </n-space>
                  </n-space>
                  <n-code :code="JSON.stringify(value, null, 2)" language="json" />
                </div>
              </n-space>
            </n-card>
            
            <n-empty v-else description="暂无数据" />
          </div>

          <n-divider />

          <!-- 所有存储汇总 -->
          <div v-if="allStorageData">
            <n-h3>存储汇总</n-h3>
            <n-space>
              <n-statistic label="Local存储" :value="allStorageData.local?.count || 0" />
              <n-statistic label="Sync存储" :value="allStorageData.sync?.count || 0" />
              <n-statistic label="Session存储" :value="allStorageData.session?.count || 0" />
            </n-space>
          </div>
        </n-space>
      </n-card>
    </main>
  </n-config-provider>
</template>

<script setup lang="js">
import { ref, onMounted } from 'vue'
import { DatabaseClient, dbExamples } from './db-utils.js'

const loading = ref(false)
const selectedStorage = ref('local')
const storageData = ref(null)
const allStorageData = ref(null)

const storageOptions = [
  { label: 'Local存储', value: 'local' },
  { label: 'Sync存储', value: 'sync' },
  { label: 'Session存储', value: 'session' }
]

const refreshData = async () => {
  loading.value = true
  try {
    await viewSelectedStorage()
  } finally {
    loading.value = false
  }
}

const viewSelectedStorage = async () => {
  if (!selectedStorage.value) return
  
  try {
    const result = await DatabaseClient.listAll(selectedStorage.value)
    storageData.value = result
    console.log(`${selectedStorage.value} 存储数据:`, result)
  } catch (error) {
    console.error('获取存储数据失败:', error)
  }
}

const viewAllStorage = async () => {
  try {
    const result = await dbExamples.viewAllStorageData()
    allStorageData.value = result
    console.log('所有存储数据:', result)
  } catch (error) {
    console.error('获取所有存储数据失败:', error)
  }
}

const copyValue = (value) => {
  navigator.clipboard.writeText(JSON.stringify(value, null, 2))
  console.log('值已复制到剪贴板')
}

const deleteItem = async (key) => {
  try {
    await DatabaseClient.delete(key, selectedStorage.value)
    await refreshData() // 刷新数据
    console.log(`已删除 ${key}`)
  } catch (error) {
    console.error('删除失败:', error)
  }
}

onMounted(() => {
  // 初始加载local存储数据
  viewSelectedStorage()
})
</script>

<style scoped>
.data-item {
  padding: 12px;
  border: 1px solid #e0e0e6;
  border-radius: 6px;
  margin-bottom: 8px;
}

.data-item:last-child {
  margin-bottom: 0;
}
</style>
