<script setup>
import { ref, onMounted } from 'vue'
import { NCard, NDescriptions, NDescriptionsItem, NTag, NSpin } from 'naive-ui'
import { api } from '@api/index.js'

const loading = ref(false)
const accountForm = ref({
  user_name: "",
  balance: "",
  token: "",
  is_active: false,
})

async function fetchAccountData() {
  loading.value = true
  try {
    const res = await api.getAccountInfo()
    accountForm.value.user_name = String(res.data.user.username)
    accountForm.value.balance = String(res.data.balance)
    accountForm.value.token = String(res.data.token)
    accountForm.value.is_active = res.data.is_active
  } catch (e) {
    console.error('获取账户信息失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAccountData()
})

</script>

<template>
    <NCard 
      size="small" 
      title="账户信息"
      :bordered="false"
      class="w-90"
      :segmented="{
        content: true
      }"
    >
      <NSpin :show="loading">
        <NDescriptions 
          label-placement="left" 
          :column="1" 
          size="small"
          label-style="width: 60px; font-size: 12px;"
          content-style="font-size: 12px;"
        >
          <NDescriptionsItem label="用户名">
            {{ accountForm.user_name || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="积分">
            {{ accountForm.balance || '0' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="Token">
            <span style="font-family: monospace; font-size: 10px; word-break: break-all;">
              {{ accountForm.token || '-' }}
            </span>
          </NDescriptionsItem>
          <NDescriptionsItem label="状态">
            <NTag 
              :type="accountForm.is_active ? 'success' : 'error'" 
              size="small"
            >
              {{ accountForm.is_active ? '已激活' : '未激活' }}
            </NTag>
          </NDescriptionsItem>
        </NDescriptions>
      </NSpin>
    </NCard>
</template>

<style scoped>
/* 自定义样式 */
</style>
