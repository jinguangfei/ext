// src/background/network.js
import {
  OBSERVED_TYPE, 
  OBSERVED_CONFIG, 
  OBSERVED_RESPONSE, 
  UPLOAD_OBSERVED_RESPONSE, 
  gen_observed_response, 
  shouldObserveRequest,
  shouldObserveResponse
} from './config'
class NetworkMonitor {
    constructor() {
      this.config = null // 观察配置
      this.debuggerTabs = new Map() // 存储正在调试的tab
      this.debuggerListener = null
      this.requestMap = new Map() // 存储请求信息
      this.init()
    }
  
    init() {
      console.log('[Background] 🚀 Network Monitor (Debugger API) 初始化')
      
      // 防止重复添加监听器
      chrome.debugger.onDetach.addListener((source, reason) => {
        console.log(`[Background] 🔌 Debugger 断开: tab ${source.tabId}, 原因: ${reason}`)
        this.debuggerTabs.delete(source.tabId)
      })
    }
  
    // 附加到指定tab进行调试
    async attachToTab(tabId) {
      try {
        // 检查是否已经在调试
        if (this.debuggerTabs.has(tabId)) {
          console.log(`[Background] ⚠️ Tab ${tabId} 已经在调试中`)
          return
        }
        
        // 检查标签页URL是否有效
        const tab = await chrome.tabs.get(tabId)
        if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
          console.log(`[Background] ❌ Tab ${tabId} URL无效，无法附加debugger: ${tab.url}`)
          return
        }
        
        // 附加debugger
        await chrome.debugger.attach({ tabId }, '1.3')
        
        // 启用Network域
        await chrome.debugger.sendCommand({ tabId }, 'Network.enable')
        
        this.debuggerTabs.set(tabId, true)
        console.log(`[Background] ✅ 已附加debugger到 tab ${tabId} (${tab.url})`)
        
      } catch (error) {
        console.log(`[Background] ❌ 附加debugger到 tab ${tabId} 失败:`, error.message)

      }
    }
  
    // 从指定tab断开调试
    async detachFromTab(tabId) {
      try {
        if (this.debuggerTabs.has(tabId)) {
          await chrome.debugger.detach({ tabId })
          this.debuggerTabs.delete(tabId)
          console.log(`[Background] 🔌 已从 tab ${tabId} 断开debugger`)
        }
      } catch (error) {
        console.log(`[Background] ❌ 从 tab ${tabId} 断开debugger失败:`, error)
      }
    }
  
    // 处理debugger事件
    handleDebuggerEvent(source, method, params) {
      const tabId = source.tabId
      
      switch (method) {
        case 'Network.requestWillBeSent':
          this.handleRequestWillBeSent(tabId, params)
          break
          
        case 'Network.loadingFinished':
          this.handleLoadingFinished(tabId, params)
          break
          
        default:
          // 忽略其他事件
          break
      }
    }
  
    // 处理请求发送事件
    handleRequestWillBeSent(tabId, params) {

      const requestId = params.requestId
      const request = params.request

      if (shouldObserveRequest(this.config, params.request.url, params.request.data, OBSERVED_TYPE.NETWORK)) {
        // 存储请求信息
        this.requestMap.set(requestId, {
          tabId,
          requestId,
          url: request.url,
          method: request.method,
          data: request.data,
          headers: request.headers,
          timestamp: Date.now()
        })
      }
    }
  
    // 处理加载完成事件
    async handleLoadingFinished(tabId, params) {
      const requestId = params.requestId
      const requestInfo = this.requestMap.get(requestId)
      
      if (!requestInfo) {
        return
      }
      
      try {
        // 获取response body
        const responseBody = await chrome.debugger.sendCommand(
          { tabId }, 
          'Network.getResponseBody', 
          { requestId }
        )
        if (!responseBody) {
          this.requestMap.delete(requestId)
          return
        }

        if (shouldObserveResponse(this.config, requestInfo.url, requestInfo.data, responseBody.body, OBSERVED_TYPE.NETWORK)){
          requestInfo.body = responseBody.body
          console.log('[Background] 🚀 观察到匹配配置的Network请求:', requestInfo)
          const postMessage = gen_observed_response(this.config, requestInfo.url, requestInfo.body)
          // 通过storage保存
          chrome.storage.local.set({ ["network_observed_response"]: postMessage })
        } else {
          console.log('[Background] 🚀 未观察到匹配配置的Network请求:', requestInfo)
        }
        // 清理请求信息
        this.requestMap.delete(requestId)
        
      } catch (error) {
        console.log(`[Background] ❌ 获取response body失败:`, error)
        // 清理请求信息
        this.requestMap.delete(requestId)
      }
    }


    // 设置观察配置
    setConfig(config) {
      this.config = config || null
      console.log('[Background] 🔄 更新观察配置:', config ? config.name : '无配置')
    }

    // 处理配置消息
    handleConfigMessage(config) {
      if (!config) {
        console.log('[Background] 📝 收到空配置，关闭Network监听')
        this.disable()
        return
      }

      console.log('[Background] 📝 收到配置消息:', config.name, '类型:', config.type)
      
      if (config.type === 'network') {
        // 设置配置并启用监听
        this.setConfig(config)
        this.enable()
        console.log('[Background] ✅ Network监听已启用')
      } else {
        // 其他类型配置，关闭监听
        this.disable()
        console.log('[Background] ❌ Network监听已关闭（收到非network类型配置）')
      }
    }
  
    // 启用网络监控
    enable() {
        chrome.tabs.query({}, (allTabs) => {
          const validTabs = allTabs.filter(tab => {
            return tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))
          })
          if (validTabs.length > 0) {
            console.log('[Background] 🎯 找到可用标签页:', validTabs[0].id)
            chrome.tabs.update(validTabs[0].id, { active: true }, () => {
              // 附加debugger
              this.attachToTab(validTabs[0].id)
              this.monitorDebuggerEvent()
              //setUserAgent(validTabs[0].id, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.62(0x18003e30) NetType/WIFI Language/zh_CN")
              //setUserAgent(validTabs[0].id, "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X; zh-CN) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 UCBrowser/15.0.0.1001 Mobile AliApp(TUnionSDK/0.1.25.0)")
            })
          } else {
            console.log('[Background] 📄 没有找到可用标签页')
          }
        })
      console.log('[Background] ✅ Network Monitor (Debugger API) 已启用')
    }
  
    // 禁用网络监控
    disable() {
      // 断开所有debugger连接
      for (const tabId of this.debuggerTabs.keys()) {
        this.detachFromTab(tabId)
      }
      console.log('[Background] ❌ Network Monitor (Debugger API) 已禁用')
    }
    monitorDebuggerEvent() {
      if (this.debuggerListener) {
        return
      }
      chrome.debugger.onEvent.addListener((source, method, params) => {
        this.handleDebuggerEvent(source, method, params)
      })
      this.debuggerListener = true
    }
  }
  
export { NetworkMonitor }