console.info('[ContentScript] contentScript is running')

// 导入数据库客户端
import { DatabaseClient } from '../shared/db-utils.js'

// 内联配置常量和函数
const OBSERVED_CONFIG = 'OBSERVED_CONFIG'
const OBSERVED_RESPONSE = 'OBSERVED_RESPONSE'
const UPLOAD_OBSERVED_RESPONSE = 'UPLOAD_OBSERVED_RESPONSE'

// 注入XHR拦截器到页面上下文
async function injectXHRInterceptor() {
  const script = document.createElement('script')
  script.src = chrome.runtime.getURL('src/contentScript/content.js')
  
  // 注入到页面头部
  ;(document.head || document.documentElement).appendChild(script)
  script.remove()
  
  // 等待脚本加载完成后发送默认配置
  setTimeout(async () => {
    try {
      const defaultConfig = await DatabaseClient.get('default_config')
      if (defaultConfig) {
        console.log('[ContentScript] 📨 读取到默认配置:', defaultConfig)
        
        // 通过消息发送配置到页面上下文
        window.postMessage({
          type: OBSERVED_CONFIG,
          config: defaultConfig
        }, '*')
        console.log('[ContentScript] 📨 默认配置已发送到页面')
      } else {
        console.log('[ContentScript] 📨 没有找到默认配置')
      }
    } catch (error) {
      console.error('[ContentScript] 📨 读取默认配置失败:', error)
    }
  }, 50) // 短暂延迟确保脚本已加载
}

// 监听来自页面的消息
window.addEventListener('message', function(event) {
  if (event.source !== window) return
  
  if (event.data.type === OBSERVED_RESPONSE) {
    console.log('[ContentScript] 📨 收到观察到的请求:', event.data.data)
    
    // 转发到background script
    chrome.runtime.sendMessage({
      type: UPLOAD_OBSERVED_RESPONSE,
      data: event.data.data
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('[ContentScript] 📨 转发消息到background失败:', chrome.runtime.lastError)
      } else {
        console.log('[ContentScript] 📨 转发消息到background成功:', response)
      }
    })
  } 
});

(async () => {
  DatabaseClient.listen('default_config', (change) => {
    console.log('[ContentScript] 📨 收到配置变化:', change)
    window.postMessage({
      type: OBSERVED_CONFIG,
      config: change.newValue
    }, '*')
  })
  console.log('[ContentScript] 📨 监听配置变化完成')
})()
// 注入拦截器（异步）
injectXHRInterceptor()