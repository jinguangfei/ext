# Chrome扩展数据库管理系统

## 概述

这是一个完整的Chrome扩展数据库管理系统，实现了以下功能：

1. **chrome.runtime 收消息** - 定义协议，只处理特定类型的数据库消息
2. **同步到chrome.storage** - 自动将数据同步到Chrome存储
3. **chrome.storage 信息变化后，chrome.runtime 发消息** - 监听存储变化并通知相关组件

## 架构设计

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Popup/Content │    │   Background    │    │ Chrome Storage │
│                 │    │                 │    │                 │
│  DatabaseClient │───▶│  DatabaseManager│───▶│   sync/local    │
│                 │    │                 │    │                 │
│  dbExamples     │    │  DB_PROTOCOL    │    │   session       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   Message Bus    │
                        │                 │
                        │  DB_CHANGE      │
                        │  notifications  │
                        └─────────────────┘
```

## 核心文件

### 1. `src/background/db.js` - 数据库管理器
- 处理所有数据库相关的chrome.runtime消息
- 管理chrome.storage的读写操作
- 监听存储变化并发送通知

### 2. `src/popup/db-utils.js` - 数据库客户端
- 提供简单的API接口
- 封装消息传递逻辑
- 提供使用示例

### 3. `src/background/index.js` - 后台脚本入口
- 导入并初始化数据库管理器
- 处理其他类型的消息

## 使用方法

### 基本操作

```javascript
import { DatabaseClient } from './db-utils.js'

// 设置数据
await DatabaseClient.set('key', 'value')

// 获取数据
const value = await DatabaseClient.get('key')

// 删除数据
await DatabaseClient.delete('key')

// 清空存储
await DatabaseClient.clear()
```

### 监听数据变化

```javascript
import { dbExamples } from './db-utils.js'

// 监听计数器变化
const unsubscribe = dbExamples.listenCountChanges((change) => {
  console.log('计数器变化:', change.newValue)
})

// 取消监听
unsubscribe()
```

### 自定义监听

```javascript
// 监听特定键的变化（简化版本）
const unsubscribe = DatabaseClient.listen('myKey', (change) => {
  console.log('数据变化:', change)
})
```

## 消息协议

### 数据库操作消息

```javascript
// 设置数据
{
  type: 'DB_SET',
  key: 'myKey',
  value: 'myValue',
  storageType: 'local' // 'local', 'sync', 'session'
}

// 获取数据
{
  type: 'DB_GET',
  key: 'myKey',
  storageType: 'local'
}

// 删除数据
{
  type: 'DB_DELETE',
  key: 'myKey',
  storageType: 'local'
}

// 清空存储
{
  type: 'DB_CLEAR',
  storageType: 'local'
}

```

### 数据变化通知

```javascript
{
  type: 'DB_CHANGE',
  key: 'myKey',
  newValue: 'newValue',
  oldValue: 'oldValue',
  areaName: 'sync'
}
```

## 存储类型

- **sync**: 同步存储，跨设备同步，有配额限制
- **local**: 本地存储，仅本地设备，配额较大
- **session**: 会话存储，浏览器会话期间有效

## 错误处理

系统包含完整的错误处理机制：

1. **降级处理**: 如果新系统失败，自动降级到原生chrome.storage
2. **错误日志**: 所有操作都有详细的日志记录
3. **异常捕获**: 所有异步操作都有try-catch保护

## 示例场景

### 1. 用户设置管理

```javascript
// 保存用户设置
await DatabaseClient.set('userSettings', {
  theme: 'dark',
  language: 'zh-CN',
  notifications: true
})

// 获取用户设置
const settings = await DatabaseClient.get('userSettings')
```

### 2. 计数器同步

```javascript
// 监听计数器变化
const unsubscribe = DatabaseClient.listen('count', (change) => {
  updateUI(change.newValue)
})

// 更新计数器
await DatabaseClient.set('count', newCount)
```

### 3. 多标签页数据同步

当任何标签页修改数据时，其他标签页会自动收到通知并更新UI。

## 调试

打开Chrome开发者工具，在Console中可以看到详细的数据库操作日志：

```
Database Manager initialized
Data set: count = 5 in sync
Storage changed in sync: {count: {newValue: 5, oldValue: 4}}
Listener added for key: count, tab: 123
```

## 扩展功能

可以根据需要扩展以下功能：

1. **数据验证**: 添加数据格式验证
2. **数据加密**: 敏感数据加密存储
3. **数据备份**: 定期备份重要数据
4. **数据迁移**: 版本升级时的数据迁移
5. **批量操作**: 支持批量读写操作
