<script setup lang="js">
import { ref, onMounted } from 'vue'
import { DatabaseClient, dbExamples } from './db-utils.js'

const message = ref('')
const data = ref({})

onMounted(async () => {
  message.value = 'SidePanel 数据库示例'
  
  // 示例：获取所有数据
  try {
    const result = await DatabaseClient.listAll('local')
    data.value = result.data
    console.log('获取到的数据:', result)
  } catch (error) {
    console.error('获取数据失败:', error)
  }
})

// 示例：保存数据
const saveData = async () => {
  try {
    await DatabaseClient.set('sidePanelTest', { 
      timestamp: Date.now(), 
      message: 'Hello from SidePanel!' 
    })
    message.value = '数据已保存！'
    
    // 重新获取数据
    const result = await DatabaseClient.listAll('local')
    data.value = result.data
  } catch (error) {
    message.value = '保存失败: ' + error.message
  }
}

// 示例：查看所有数据
const viewAllData = async () => {
  await dbExamples.viewAllData('local')
}

// 示例：搜索数据
const searchData = async () => {
  await dbExamples.searchData('sidePanel', 'local')
}
</script>

<template>
  <main>
    <h3>{{ message }}</h3>

    <div class="data-section">
      <h4>当前数据:</h4>
      <pre>{{ JSON.stringify(data, null, 2) }}</pre>
    </div>

    <div class="controls">
      <button @click="saveData">保存测试数据</button>
      <button @click="viewAllData">查看所有数据</button>
      <button @click="searchData">搜索数据</button>
    </div>

    <div class="info">
      <p>这是一个简单的数据库工具类示例</p>
      <p>点击按钮测试不同的数据库操作</p>
    </div>
  </main>
</template>

<style>
:root {
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;

  color-scheme: light dark;
  background-color: #242424;
}

@media (prefers-color-scheme: light) {
  :root {
    background-color: #fafafa;
  }

  a:hover {
    color: #42b983;
  }
}

body {
  min-width: 20rem;
}

main {
  text-align: center;
  padding: 1em;
  margin: 0 auto;
}

h3 {
  color: #42b983;
  text-transform: uppercase;
  font-size: 1.5rem;
  font-weight: 200;
  line-height: 1.2rem;
  margin: 2rem auto;
}

a {
  font-size: 0.5rem;
  margin: 0.5rem;
  color: #cccccc;
  text-decoration: none;
}

.data-section {
  margin: 1rem 0;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.data-section pre {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  overflow-x: auto;
}

.controls {
  margin: 1rem 0;
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.info {
  margin: 1rem 0;
  text-align: center;
  font-size: 0.9rem;
  color: #cccccc;
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #42b983;
  color: white;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #369870;
}

button:active {
  background-color: #2d7a5a;
}
</style>
