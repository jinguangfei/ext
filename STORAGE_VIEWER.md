# 数据库存储查看器

## 功能说明

这个工具可以帮助您查看Chrome扩展中所有通过数据库存储的数据。

## 使用方法

### 1. 在代码中查看存储数据

```javascript
import { DatabaseClient, dbExamples } from './src/popup/db-utils.js'

// 查看local存储的所有数据
const localData = await DatabaseClient.listAll('local')
console.log('Local存储数据:', localData)

// 查看sync存储的所有数据
const syncData = await DatabaseClient.listAll('sync')
console.log('Sync存储数据:', syncData)

// 查看session存储的所有数据
const sessionData = await DatabaseClient.listAll('session')
console.log('Session存储数据:', sessionData)

// 查看所有存储类型的数据
const allData = await dbExamples.viewAllStorageData()
console.log('所有存储数据:', allData)
```

### 2. 使用StorageViewer组件

```vue
<template>
  <StorageViewer />
</template>

<script setup>
import StorageViewer from './StorageViewer.vue'
</script>
```

### 3. 使用测试脚本

```javascript
// 在浏览器控制台中运行
import('./test-storage.js').then(module => {
  // 运行完整测试
  module.main()
  
  // 或者只查看数据
  module.viewAllStoredData()
})
```

## API 说明

### DatabaseClient.listAll(storageType)

列出指定存储类型的所有数据。

**参数:**
- `storageType` (string): 存储类型 ('local', 'sync', 'session')

**返回值:**
```javascript
{
  storageType: 'local',
  data: {
    key1: 'value1',
    key2: { nested: 'object' },
    key3: [1, 2, 3]
  },
  count: 3
}
```

### dbExamples.viewAllStorageData()

查看所有存储类型的数据汇总。

**返回值:**
```javascript
{
  local: {
    storageType: 'local',
    data: { ... },
    count: 5
  },
  sync: {
    storageType: 'sync',
    data: { ... },
    count: 2
  },
  session: {
    storageType: 'session',
    data: { ... },
    count: 1
  }
}
```

## 存储类型说明

| 类型 | 说明 | 配额 | 同步 | 用途 |
|------|------|------|------|------|
| `local` | 本地存储 | 5MB | ❌ | 用户设置、缓存数据 |
| `sync` | 同步存储 | 100KB | ✅ | 跨设备同步的设置 |
| `session` | 会话存储 | 1MB | ❌ | 临时数据 |

## 实际使用示例

### 查看当前扩展的所有数据

```javascript
// 在popup或content script中运行
async function checkAllData() {
  try {
    const allData = await dbExamples.viewAllStorageData()
    
    console.log('=== 扩展存储数据汇总 ===')
    console.log(`Local存储: ${allData.local.count} 项`)
    console.log(`Sync存储: ${allData.sync.count} 项`)
    console.log(`Session存储: ${allData.session.count} 项`)
    
    // 详细查看local存储
    if (allData.local.count > 0) {
      console.log('Local存储详情:', allData.local.data)
    }
    
    return allData
  } catch (error) {
    console.error('查看数据失败:', error)
  }
}

// 运行检查
checkAllData()
```

### 调试特定数据

```javascript
// 查看特定键的数据
async function debugSpecificData() {
  try {
    // 查看计数器
    const count = await DatabaseClient.get('count')
    console.log('当前计数器值:', count)
    
    // 查看用户设置
    const settings = await DatabaseClient.get('userSettings')
    console.log('用户设置:', settings)
    
    // 查看所有local存储
    const localData = await DatabaseClient.listAll('local')
    console.log('Local存储所有数据:', localData)
    
  } catch (error) {
    console.error('调试数据失败:', error)
  }
}
```

## 注意事项

1. **权限**: 确保扩展有storage权限
2. **异步操作**: 所有操作都是异步的，需要使用await或.then()
3. **错误处理**: 建议使用try-catch处理可能的错误
4. **数据格式**: 返回的数据是原始格式，复杂对象需要JSON.stringify()查看

## 故障排除

### 常见问题

1. **无法获取数据**
   - 检查扩展是否有storage权限
   - 确认background script正在运行

2. **数据为空**
   - 可能是存储类型错误
   - 检查数据是否真的存在

3. **权限错误**
   - 在manifest.json中添加storage权限
   - 重启扩展

### 调试技巧

```javascript
// 检查扩展权限
chrome.permissions.getAll((permissions) => {
  console.log('扩展权限:', permissions)
})

// 检查存储配额使用情况
chrome.storage.local.getBytesInUse((bytes) => {
  console.log('Local存储使用:', bytes, 'bytes')
})

chrome.storage.sync.getBytesInUse((bytes) => {
  console.log('Sync存储使用:', bytes, 'bytes')
})
```
