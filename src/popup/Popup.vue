<script setup>
import { ref, onMounted } from 'vue'
import LoginView from '@/views/login/index.vue'
import ProfileView from '@/views/profile/index.vue'
import { getToken } from '@utils/auth/token.js'

const isLoggedIn = ref(false)
const isLoading = ref(true)

// 检查登录状态
async function checkLoginStatus() {
  isLoading.value = true
  try {
    const token = await getToken()
    isLoggedIn.value = !!token
  } catch (e) {
    console.error('检查登录状态失败', e)
    isLoggedIn.value = false
  } finally {
    isLoading.value = false
  }
}

// 组件挂载时检查登录状态
onMounted(() => {
  checkLoginStatus()
  
  // 监听登录成功事件
  window.addEventListener('loginSuccess', () => {
    isLoggedIn.value = true
  })
})
</script>

<template>
  <div v-if="isLoading" class="w-full h-full flex items-center justify-center">
    <div>加载中...</div>
  </div>
  <ProfileView v-else-if="isLoggedIn" />
  <LoginView v-else />
</template>

<style scoped>
/* popup 窗口样式优化 */
html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
