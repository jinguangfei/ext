const OBSERVED_TYPE = "network"
function shouldObserveConfig(config, type) {
  if (!config) return false
  if (config.type !== type) {
    return false
  }
  return true
}

function shouldObserveRequest(config, url, requestData, type) {
  if (!shouldObserveConfig(config, type)) {
    return false
  }
  // 必须检查：域名匹配
  if (!config.domain || !url.includes(config.domain)) {
    return false
  }
  // 必须检查：URL白名单
  if (!config.url_whitelist || config.url_whitelist.length === 0) {
    return false
  }
  // 必须检查：URL白名单
  const urlMatches = config.url_whitelist.some(pattern => url.includes(pattern))
  if (!urlMatches) {
    return false
  }
  // 可选检查：URL黑名单
  if (config.url_blacklist && config.url_blacklist.length > 0) {
    const urlBlocked = config.url_blacklist.some(pattern => url.includes(pattern))
    if (urlBlocked) {
      return false
    }
  }
  return true
}

function shouldObserveResponse(config, url, requestData, responseData, type) {
  if (!shouldObserveConfig(config, type)) {
    return false
  }
  // 可选检查：请求体白名单
  if (config.body_whitelist && config.body_whitelist.length > 0 && responseData) {
    const bodyMatches = config.body_whitelist.some(pattern => 
      responseData.toString().includes(pattern)
    )
    if (!bodyMatches) {
      return false
    }
  }
  // 可选检查：请求体黑名单
  if (config.body_blacklist && config.body_blacklist.length > 0 && responseData) {
    const bodyBlocked = config.body_blacklist.some(pattern => 
      responseData.toString().includes(pattern)
    )
    if (bodyBlocked) {
      return false
    }
  }
  return true
}
// 处理debugger事件
function handleDebuggerEvent(source, method, params) {
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

class Monitor {
  constructor(result_ref) {
    this.requestMap = new Map()
    this.config = null
    self.reduslt = result_ref
  }

  init() {
    chrome.debugger.onEvent.addListener(this.handleDebuggerEvent)
  }

 // 处理请求发送事件
  handleRequestWillBeSent(tabId, params) {

    const requestId = params.requestId
    const request = params.request
    const requestUrl = params.request.url
    const requestData = params.request.data

    if (shouldObserveRequest(this.config, requestUrl, requestData, OBSERVED_TYPE)) {
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
      
      // 60秒后自动删除该请求记录
      setTimeout(() => {
        if (this.requestMap.has(requestId)) {
          console.log(`[Monitor] 自动删除超时请求: ${requestId}`)
          this.requestMap.delete(requestId)
        }
      }, 60000) // 60秒
    }
  } 
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

      if (shouldObserveResponse(this.config, requestInfo.url, requestInfo.data, responseBody.body, OBSERVED_TYPE)){
        console.log('[Monitor] 观察到Network请求:', requestInfo)
        const postMessage = {
          url: requestInfo.url,
          config: this.config,
          response: responseBody.body,
          timestamp: new Date().toISOString()
        } // 通过storage保存
        //chrome.storage.local.set({ ["network_observed_response"]: postMessage })
        this.result_ref.value = postMessage
      } else {
        console.log('[Monitor] 未观察到Network请求:', requestInfo)
      }
      // 清理请求信息
      this.requestMap.delete(requestId)
      
    } catch (error) {
      console.log(`[Background] ❌ 获取response body失败:`, error)
      // 清理请求信息
      this.requestMap.delete(requestId)
    }
  }

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
}