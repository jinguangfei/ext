// XHR观察器 - 运行在页面上下文中
(function() {
  // 内联配置常量和函数
  const OBSERVED_CONFIG = 'OBSERVED_CONFIG'
  const OBSERVED_RESPONSE = 'OBSERVED_RESPONSE'

  const OBSERVED_TYPE = {
    XHR: 'xhr',
    HTML: 'html',
    NETWORK: 'network'
  }

  function gen_observed_response(config, url, response) {
    return {
      type: OBSERVED_RESPONSE,
      data: {
        url: url,
        config: config,
        response: response,
        timestamp: new Date().toISOString()
      }
    }
  }

  function shouldObserveResponse(config, url, requestData, responseData, type) {
    if (!config) return false

    if (config.type !== type) {
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
    
    // 如果所有条件都匹配，则观察
    return true
  }
  // XHR观察器
  class ContentMonitor {
    constructor(config) {
      this.config = config // 观察配置
      
      this.init()
    }


    init() {

      // 观察XHR请求
      this.monitorXHR()
      // 观察HTML页面
      this.monitorHTMLPage()
    }
    monitorXHR() {
      // 保存原始方法
      const self = this
      console.log('[PageContext] 初始化XHR观察器')

      // 重写XMLHttpRequest.prototype.open
      const originalOpen = XMLHttpRequest.prototype.open
      XMLHttpRequest.prototype.open = function(method, url, ...args) {
        // 监听响应
        this.addEventListener('readystatechange', function() {
          if (this.readyState === 4 && this.status >= 200 && this.status < 300) {
            // 检查是否需要观察此响应
            const flag = shouldObserveResponse(
              self.config, 
              this.responseURL, 
              this._data || '', 
              this.responseText, 
              OBSERVED_TYPE.XHR)
            if (flag) {
              // 发送消息到content script
              const postMessage = gen_observed_response(
                self.config, 
                this.responseURL, 
                this.responseText, 
              )
              console.log('[PageContext] 🚀 发送XHR观察消息:', postMessage)
              window.postMessage(postMessage, '*')
            }
          }
        })
        
        return originalOpen.apply(this, [method, url, ...args])
      }
    }

    // 观察HTML页面本身
    monitorHTMLPage() {
      const self = this
      console.log('[PageContext] 初始化HTML页面观察器')
      // 检查当前页面URL是否匹配配置
      const flag = shouldObserveResponse(self.config, window.location.href, '', document.documentElement.outerHTML, OBSERVED_TYPE.HTML)
      if (flag) {
        // 获取页面HTML内容
        const htmlContent = document.documentElement.outerHTML
        const postMessage = gen_observed_response(self.config, window.location.href, htmlContent)
        console.log('[PageContext] 🚀 发送页面HTML观察消息:', postMessage)
        // 发送页面HTML观察消息
        window.postMessage(postMessage, '*')
        
      }
    }

    // 设置观察配置
    setConfig(config) {
      this.config = config || null
      console.log('[PageContext] 🔄 更新观察配置:', config ? config.name : '无配置')
    }
  }

  
  // 监听来自content script的消息
  window.addEventListener('message', function(event) {
    console.log('[PageContext] 🚀 收到消息:', event)
    if (event.source !== window) return
    if (event.data.type === OBSERVED_CONFIG) {
      // 接收完整的配置信息
      const config = event.data.config
      if (config && config.name) {
        console.log('[PageContext] 📝 收到配置:', config.type, config.name)
        // 只处理 XHR 和 HTML 类型的配置，network 类型由 background 处理
        if (config.type === OBSERVED_TYPE.XHR || config.type === OBSERVED_TYPE.HTML) {
          // 创建观察器实例
          if (!window.contentMonitor) {
            window.contentMonitor = new ContentMonitor(config)
          } else{
            window.contentMonitor.setConfig(config)
          } 
          console.log('[PageContext] 📝 已设置配置到 ContentMonitor:', config)
        } else {
          console.log('[PageContext] 📝 跳过配置类型 (由 background 处理):', config.type)
        }
      } else {
        console.log('[PageContext] 📝 配置无效:', config)
      }
    }
  })
  
  console.log('[PageContext] 🎯 ContentMonitor已注入到页面上下文，已请求默认配置')
})()
