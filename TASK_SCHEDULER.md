# 任务调度器功能说明

## 功能概述

本功能实现了自动任务调度和数据拦截处理，具体包括：

1. **间隔获取任务**: 根据配置的 `timeout` 间隔时间自动从服务器获取任务URL
2. **自动跳转**: 获取到任务后自动跳转到指定URL
3. **数据拦截**: 拦截页面数据并发送到服务器
4. **智能timeout**: 根据服务器返回结果设置临时timeout

## 使用方法

### 1. 设置默认配置

在 Options 页面设置默认配置，确保包含以下字段：
- `timeout`: 任务间隔时间（秒）
- `break_flag`: 触发临时timeout的标志数组，如 `["login", "deny"]`

### 2. 启动任务调度器

在 SidePanel 页面：
1. 确保已设置默认配置
2. 点击"启动调度器"按钮
3. 调度器将开始按配置的间隔时间获取任务

### 3. 监控状态

在 SidePanel 页面可以查看：
- 调度器运行状态（运行中/已停止）
- 当前间隔时间
- 临时timeout状态（如果有）

## 临时timeout机制

当服务器返回特定标志时，会自动设置临时timeout：

- **login**: 24小时临时timeout
- **deny**: 1小时临时timeout

在临时timeout期间，任务调度器会暂停执行，直到临时timeout结束。

## API接口

### 获取任务
```
POST /config/get_task
```
返回任务URL

### 完成任务
```
POST /config/over_task
Body: {
  "url": "任务URL",
  "result": "拦截到的数据"
}
```
返回处理结果和标志

## 配置示例

```javascript
{
  "name": "陶特详情",
  "type": "network",
  "domain": "taobao.com",
  "url_whitelist": ["mtop.taobao.ltao.detail.h5.data.get"],
  "url_blacklist": [],
  "body_whitelist": [],
  "body_blacklist": ["FAIL_SYS_TOKEN"],
  "web": true,
  "timeout": 20,
  "break_flag": ["login", "deny"]
}
```

## 注意事项

1. 确保后端服务正常运行
2. 确保已设置有效的默认配置
3. 临时timeout期间调度器会暂停，这是正常行为
4. 可以通过SidePanel界面手动启动/停止调度器
