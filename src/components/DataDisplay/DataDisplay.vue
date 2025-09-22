<script setup lang="js">
import { computed, h } from 'vue'
import { NCard, NTag, NDataTable, NButton, NSpace, NAlert } from 'naive-ui'
import { formatDataSize, downloadData } from '../../shared/utils.js'

// 定义 props
const props = defineProps({
  // 拦截到的数据列表
  data: {
    type: Array,
    default: () => []
  },
  // 数据总数
  count: {
    type: Number,
    default: 0
  }
})

// 定义 emits
const emit = defineEmits(['clear'])



// 拦截数据表格列定义
const columns = [
  {
    title: '时间',
    key: 'date',
    width: 160
  },
  {
    title: '数据大小',
    key: 'dataSize',
    width: 100,
    render: (row) => {
      return h(NButton, {
        size: 'small',
        type: 'primary',
        text: true,
        onClick: () => downloadData(row.originalData, `${row.name}_${row.date.replace(/[^\w]/g, '_')}`)
      }, { default: () => row.dataSize })
    }
  }
]

// 格式化拦截数据显示
const formatInterceptedData = (data) => {
  return {
    ...data,
    dataSize: formatDataSize(data.data),
    originalData: data.data // 保存原始数据用于下载
  }
}
// 计算属性：格式化后的拦截数据
const formattedData = computed(() => {
  return props.data.map(formatInterceptedData)
})

// 清空数据
const handleClear = () => {
  emit('clear')
}
</script>

<template>
  <n-card title="拦截到的数据" size="small" class="intercepted-card">
    <template #header-extra>
      <n-space>
        <n-tag type="info" size="small">
          共 {{ count }} 条
        </n-tag>
        <n-button 
          size="small" 
          type="error" 
          @click="handleClear"
        >
          清空
        </n-button>
      </n-space>
    </template>

    <div v-if="data.length > 0">
      <n-data-table
        :columns="columns"
        :data="formattedData"
        :pagination="false"
        size="small"
      />
    </div>
    <div v-else>
      <n-alert type="info" title="暂无拦截数据">
        <!-- 拦截数据特定的空内容提示 -->
      </n-alert>
    </div>
  </n-card>
</template>

<style scoped>
.intercepted-card {
  margin-top: 16px;
}
</style>
