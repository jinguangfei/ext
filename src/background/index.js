import { NetworkMonitor } from './network.js'
import { OBSERVED_CONFIG, OBSERVED_RESPONSE, UPLOAD_OBSERVED_RESPONSE } from './config.js'

console.log('[Background] background is running')

// 导入数据库管理器（自动初始化）
// dbManager 会自动处理所有数据库相关的消息
  console.log('[Background] chrome.debugger', chrome.debugger)
  console.log('[Background] chrome.debugger', chrome.debugger.onAttach)
  console.log('[Background] chrome.debugger', chrome.debugger.onDetach)

const initialConfig = {
  "name": "pdd",
  "domain": "yangkeduo.com",
  "url_whitelist": ["752232136941","752232136940"],
  "url_blacklist": [],
  "body_whitelist": [],
  "body_blacklist": [],
  "type": "network",
  "is_enabled": true      }
// 初始化NetworkMonitor实例（全局单例）
let networkMonitor = new NetworkMonitor()

// 插件加载完成时 做以下操作
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] 插件已安装，NetworkMonitor已初始化')
})
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === UPLOAD_OBSERVED_RESPONSE) {
    console.log('[Background] background 收到观察到的请求:', request.data)
    sendResponse({ success: true })
  } else if (request.type === OBSERVED_CONFIG) {
    console.log('[Background] background 收到配置消息:', request.config?.name, '类型:', request.config?.type)
    networkMonitor.handleConfigMessage(request.config)
    sendResponse({ success: true })
  } else if (request.type === 'COUNT') {
    console.log('[Background] background 收到计数器消息:', request.count)
    sendResponse({ success: true })
  } else {
    console.log('[Background] background 收到未知消息类型:', request.type)
    sendResponse({ success: false, error: 'Unknown message type' })
  }
  return true
})