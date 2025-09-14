<script setup lang="js">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { DatabaseClient, dbExamples } from './db-utils.js'

const count = ref(0)
const link = ref('https://github.com/guocaoyi/create-chrome-ext')
let unsubscribeCountListener = null

const minus = () => {
  if (count.value > 0) count.value--
}
const add = () => count.value++

onMounted(async () => {
  try {
    // 使用新的数据库系统获取计数器
    const savedCount = await DatabaseClient.get('count')
    count.value = savedCount || 0
    
    // 监听计数器变化
    unsubscribeCountListener = dbExamples.listenCountChanges((change) => {
      console.log('计数器变化:', change)
      count.value = change.newValue || 0
    })
    
    console.log('数据库系统初始化完成')
  } catch (error) {
    console.error('初始化数据库失败:', error)
    // 降级到原有的chrome.storage方式
    chrome.storage.sync.get(['count'], (result) => {
      count.value = result.count || 0
    })
  }
})

onUnmounted(() => {
  // 清理监听器
  if (unsubscribeCountListener) {
    unsubscribeCountListener()
  }
})

watch(count, async (newCount) => {
  try {
    // 使用新的数据库系统保存计数器
    await DatabaseClient.set('count', newCount)
    
    // 发送消息给background
    chrome.runtime.sendMessage({ type: 'COUNT', count: count.value })
    
    console.log('计数器已保存到数据库:', newCount)
  } catch (error) {
    console.error('保存计数器失败:', error)
    // 降级到原有的chrome.storage方式
    chrome.storage.sync.set({ count: newCount })
  }
})
</script>

<template>
  <n-config-provider>
    <main>
      <n-card title="Chrome 扩展" style="margin: 16px;">
        <n-space vertical>
          <n-h3>计数器</n-h3>
          
          <n-space justify="between" align="center">
            <n-button 
              @click="minus" 
              :disabled="count <= 0"
              type="error"
              circle
            >
              -
            </n-button>
            <n-tag type="info" size="large">{{ count }}</n-tag>
            <n-button 
              @click="add"
              type="success"
              circle
            >
              +
            </n-button>
          </n-space>

        </n-space>
      </n-card>
    </main>
  </n-config-provider>
</template>

<style>
body {
  min-width: 20rem;
  margin: 0;
  padding: 0;
}

main {
  padding: 0;
  margin: 0;
}
</style>
