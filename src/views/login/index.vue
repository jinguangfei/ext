<template>
    <NCard 
      size="small" 
      title="登录"
      :bordered="false"
      class="w-60"
      :segmented="{
        content: true,
        footer: 'soft'
      }"
    >
      <NSpace vertical :size="18">
        <NInput
          v-model:value="loginInfo.username"
          placeholder="用户名"
          :maxlength="20"
          size="small"
          clearable
        >
          <template #prefix>
            <NIcon :component="PersonOutline" />
          </template>
        </NInput>
        
        <NInput
          v-model:value="loginInfo.password"
          type="password"
          placeholder="密码"
          :maxlength="20"
          size="small"
          show-password-on="click"
          @keyup.enter="handleLogin"
        >
          <template #prefix>
            <NIcon :component="LockClosedOutline" />
          </template>
        </NInput>
      </NSpace>
      
      <template #footer>
        <NButton
          type="primary"
          size="small"
          block
          :loading="loading"
          @click="handleLogin"
        >
          登录
        </NButton>
      </template>
    </NCard>
</template>

<script setup>
import { ref } from 'vue'
import { NCard, NInput, NButton, NSpace, NIcon } from 'naive-ui'
import { PersonOutline, LockClosedOutline } from '@vicons/ionicons5'
import { DatabaseClient } from '@shared/db-utils.js'
import { setToken } from '@utils/auth/index.js'
import { api } from '@api/index.js'

const loginInfo = ref({
  username: '',
  password: '',
})

initLoginInfo()

async function initLoginInfo() {
  try {
    const localLoginInfo = await DatabaseClient.get('loginInfo')
    if (localLoginInfo) {
      loginInfo.value.username = localLoginInfo.username || ''
      loginInfo.value.password = localLoginInfo.password || ''
    }
  } catch (e) {
    console.log('初始化登录信息失败', e)
  }
}

const loading = ref(false)

async function handleLogin() {
  const { username, password } = loginInfo.value
  if (!username || !password) {
    console.log('用户名或密码不能为空')
    return
  }
  
  loading.value = true
  try {
    const res = await api.login({ username, password: password.toString() })
    await DatabaseClient.set('loginInfo', { username, password })
    await setToken(res.data.access_token)
    
    console.log('登录成功')
    
    // 触发登录成功事件
    window.dispatchEvent(new CustomEvent('loginSuccess'))
  } catch (e) {
    console.error('登录错误', e)
  } finally {
    loading.value = false
  }
}
</script>
  