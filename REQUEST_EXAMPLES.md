# Chrome Runtime Message Request 样式示例

## 基本结构

```javascript
// handleMessage 函数签名
async handleMessage(request, sender, sendResponse) {
  // request 是消息对象
  // sender 是发送者信息
  // sendResponse 是响应函数
}
```

## Request 对象结构

### 1. 数据库操作 Request 样式

#### SET 操作 - 设置数据
```javascript
const request = {
  type: 'DB_SET',                    // 必需：操作类型
  key: 'userSettings',              // 必需：数据键
  value: {                          // 必需：数据值
    theme: 'dark',
    language: 'zh-CN',
    notifications: true
  },
  storageType: 'local'              // 可选：存储类型，默认 'local'
}

// 简化版本
const simpleRequest = {
  type: 'DB_SET',
  key: 'count',
  value: 42
}
```

#### GET 操作 - 获取数据
```javascript
const request = {
  type: 'DB_GET',                    // 必需：操作类型
  key: 'userSettings',              // 必需：数据键
  storageType: 'local'               // 可选：存储类型，默认 'local'
}

// 简化版本
const simpleRequest = {
  type: 'DB_GET',
  key: 'count'
}
```

#### DELETE 操作 - 删除数据
```javascript
const request = {
  type: 'DB_DELETE',                // 必需：操作类型
  key: 'tempData',                  // 必需：数据键
  storageType: 'session'             // 可选：存储类型，默认 'local'
}

// 简化版本
const simpleRequest = {
  type: 'DB_DELETE',
  key: 'count'
}
```

#### CLEAR 操作 - 清空存储
```javascript
const request = {
  type: 'DB_CLEAR',                 // 必需：操作类型
  storageType: 'local'              // 可选：存储类型，默认 'local'
}

// 简化版本
const simpleRequest = {
  type: 'DB_CLEAR'
}
```

### 2. 其他类型 Request 样式

#### COUNT 消息（原有功能）
```javascript
const request = {
  type: 'COUNT',                    // 必需：消息类型
  count: 15                         // 必需：计数值
}
```

#### 自定义消息
```javascript
const request = {
  type: 'CUSTOM_ACTION',            // 必需：消息类型
  action: 'updateUI',              // 自定义：操作
  data: {                          // 自定义：数据
    elementId: 'counter',
    newValue: 100
  },
  timestamp: Date.now()             // 自定义：时间戳
}
```

## Sender 对象结构

```javascript
const sender = {
  tab: {                           // 如果来自标签页
    id: 123,                       // 标签页ID
    url: 'https://example.com',    // 标签页URL
    title: 'Example Page'          // 标签页标题
  },
  frameId: 0,                      // 框架ID
  id: 'extension-id',              // 扩展ID
  url: 'chrome-extension://...',   // 扩展URL
  tlsChannelId: 'channel-id'       // TLS通道ID
}
```

## 完整示例

### 1. 在 Popup 中发送消息

```javascript
// 设置数据
chrome.runtime.sendMessage({
  type: 'DB_SET',
  key: 'userPreferences',
  value: {
    theme: 'dark',
    fontSize: 14,
    autoSave: true
  },
  storageType: 'sync'
}, (response) => {
  if (response && response.success) {
    console.log('数据保存成功:', response.data)
  } else {
    console.error('数据保存失败:', response?.error)
  }
})

// 获取数据
chrome.runtime.sendMessage({
  type: 'DB_GET',
  key: 'userPreferences',
  storageType: 'sync'
}, (response) => {
  if (response && response.success) {
    console.log('获取的数据:', response.data)
  } else {
    console.error('获取数据失败:', response?.error)
  }
})
```

### 2. 在 Content Script 中发送消息

```javascript
// 从网页发送消息到background
chrome.runtime.sendMessage({
  type: 'DB_SET',
  key: 'pageData',
  value: {
    url: window.location.href,
    title: document.title,
    timestamp: Date.now()
  },
  storageType: 'local'
})
```

### 3. Background 处理消息

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request)
  console.log('发送者:', sender)
  
  // 处理不同类型的消息
  switch (request.type) {
    case 'DB_SET':
      // 处理设置数据
      break
    case 'DB_GET':
      // 处理获取数据
      break
    case 'COUNT':
      // 处理计数消息
      break
    default:
      console.log('未知消息类型:', request.type)
  }
  
  return true // 保持消息通道开放
})
```

## 消息验证

### 必需字段检查
```javascript
function validateRequest(request) {
  const requiredFields = ['type']
  
  for (const field of requiredFields) {
    if (!request[field]) {
      throw new Error(`缺少必需字段: ${field}`)
    }
  }
  
  // 数据库操作需要key字段
  if (['DB_SET', 'DB_GET', 'DB_DELETE'].includes(request.type)) {
    if (!request.key) {
      throw new Error('数据库操作需要key字段')
    }
  }
  
  // SET操作需要value字段
  if (request.type === 'DB_SET' && request.value === undefined) {
    throw new Error('SET操作需要value字段')
  }
}
```

### 存储类型验证
```javascript
function validateStorageType(storageType) {
  const validTypes = ['sync', 'local', 'session']
  if (storageType && !validTypes.includes(storageType)) {
    throw new Error(`无效的存储类型: ${storageType}`)
  }
}
```

## 错误处理

### 请求格式错误
```javascript
// 错误示例
const invalidRequest = {
  // 缺少type字段
  key: 'test',
  value: 'data'
}

// 错误示例
const invalidRequest2 = {
  type: 'DB_SET',
  // 缺少key字段
  value: 'data'
}
```

### 响应格式
```javascript
// 成功响应
const successResponse = {
  success: true,
  data: {
    key: 'userSettings',
    value: { theme: 'dark' }
  }
}

// 错误响应
const errorResponse = {
  success: false,
  error: 'Invalid storage type'
}
```

## 最佳实践

1. **总是包含type字段**
2. **使用有意义的key名称**
3. **验证必需字段**
4. **处理响应错误**
5. **使用适当的存储类型**
6. **保持消息结构简单**
7. **添加时间戳用于调试**
