<script setup lang="js">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const count = ref(0)
const link = ref('https://github.com/guocaoyi/create-chrome-ext')

const minus = () => {
  if (count.value > 0) count.value--
}
const add = () => count.value++

onMounted(() => {
  chrome.storage.sync.get(['count'], (result) => {
    count.value = result.count || 0
  })
})

watch(count, (newCount) => {
  chrome.storage.sync.set({ count: newCount })

  chrome.runtime.sendMessage({ type: 'COUNT', count: count.value })
})
</script>

<template>
  <n-config-provider>
    <main>
      <n-card title="Chrome 扩展 测试" style="margin: 16px;">
        <n-space vertical>
          <n-h3>计数器</n-h3>
          
          <n-space justify="center" align="center">
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
