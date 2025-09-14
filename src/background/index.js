import dbManager, { DB_PROTOCOL } from '../shared/db.js'

console.log('background is running')

// 导入数据库管理器（自动初始化）
// dbManager 会自动处理所有数据库相关的消息

// 处理其他类型的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'COUNT') {
    console.log('background has received a message from popup, and count is ', request?.count)
  }
  
  // 数据库消息由dbManager处理，这里不需要处理
  return true
})
