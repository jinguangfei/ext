# Request 对象结构图

## 基本结构

```
┌─────────────────────────────────────────┐
│                Request                  │
├─────────────────────────────────────────┤
│  type: string (必需)                    │
│  ├─ 'DB_SET'                           │
│  ├─ 'DB_GET'                           │
│  ├─ 'DB_DELETE'                        │
│  ├─ 'DB_CLEAR'                         │
│  └─ 'COUNT' (其他类型)                  │
├─────────────────────────────────────────┤
│  key: string (可选)                     │
│  ├─ 数据键名                           │
│  └─ 用于DB_SET, DB_GET, DB_DELETE      │
├─────────────────────────────────────────┤
│  value: any (可选)                      │
│  ├─ 要存储的数据                       │
│  └─ 仅用于DB_SET操作                   │
├─────────────────────────────────────────┤
│  storageType: string (可选)             │
│  ├─ 'local' (默认)                     │
│  ├─ 'sync'                             │
│  └─ 'session'                          │
└─────────────────────────────────────────┘
```

## 具体示例

### 1. DB_SET 请求
```javascript
{
  type: 'DB_SET',           // 必需
  key: 'userSettings',      // 必需
  value: {                  // 必需
    theme: 'dark',
    language: 'zh-CN'
  },
  storageType: 'local'      // 可选，默认'local'
}
```

### 2. DB_GET 请求
```javascript
{
  type: 'DB_GET',           // 必需
  key: 'userSettings',      // 必需
  storageType: 'local'      // 可选，默认'local'
}
```

### 3. DB_DELETE 请求
```javascript
{
  type: 'DB_DELETE',        // 必需
  key: 'tempData',          // 必需
  storageType: 'session'    // 可选，默认'sync'
}
```

### 4. DB_CLEAR 请求
```javascript
{
  type: 'DB_CLEAR',         // 必需
  storageType: 'local'      // 可选，默认'local'
}
```

### 5. COUNT 请求（非数据库）
```javascript
{
  type: 'COUNT',            // 必需
  count: 42                 // 必需
}
```

## 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 消息类型，必须是预定义的操作类型 |
| `key` | string | ⚠️ | 数据键名，DB_SET/GET/DELETE时必需 |
| `value` | any | ⚠️ | 数据值，仅DB_SET时必需 |
| `storageType` | string | ❌ | 存储类型，默认为'local' |

## 存储类型说明

| 类型 | 说明 | 配额 | 同步 |
|------|------|------|------|
| `sync` | 同步存储 | 100KB | ✅ 跨设备 |
| `local` | 本地存储 | 5MB | ❌ 仅本地 |
| `session` | 会话存储 | 1MB | ❌ 会话期间 |

## 验证规则

```javascript
// 验证函数示例
function validateRequest(request) {
  // 1. 检查必需字段
  if (!request.type) {
    throw new Error('缺少type字段')
  }
  
  // 2. 检查数据库操作
  const dbOperations = ['DB_SET', 'DB_GET', 'DB_DELETE', 'DB_CLEAR']
  if (dbOperations.includes(request.type)) {
    if (!request.key && request.type !== 'DB_CLEAR') {
      throw new Error(`${request.type}操作需要key字段`)
    }
    if (request.type === 'DB_SET' && request.value === undefined) {
      throw new Error('DB_SET操作需要value字段')
    }
  }
  
  // 3. 检查存储类型
  const validStorageTypes = ['sync', 'local', 'session']
  if (request.storageType && !validStorageTypes.includes(request.storageType)) {
    throw new Error(`无效的存储类型: ${request.storageType}`)
  }
}
```
