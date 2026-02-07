// 公共chrome工具类
// 监听活动tab变化
// 获取当前活动标签页
export const getCurrentTab = (callback) => {
    try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            callback(tabs[0])
        })
    } catch (error) {
    }
  }
//  设置标签页监听器
export const setupTabListeners = (currentTab) => {
    getCurrentTab((tab) => {
      currentTab.value = tab
    })
  // 监听标签页激活事件
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId)
      currentTab.value = tab
    } catch (error) {
    }
  })

  // 监听标签页更新事件（URL变化、标题变化等）
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // 只处理当前活动标签页的更新
    if (tab.active && changeInfo.status === 'complete') {
      currentTab.value = tab
    }
  })

  // 监听标签页移除事件
  chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    console.log('[SidePanel] 标签页移除:', tabId)
    // 如果移除的是当前活动标签页，需要重新获取当前标签页
    if (currentTab.value && currentTab.value.id === tabId) {
      getCurrentTab((tab) => {
        currentTab.value = tab
      })
    }
  })

  // 监听窗口焦点变化
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
      // 窗口获得焦点时，更新当前活动标签页
      await getCurrentTab((tab) => {
        currentTab.value = tab
      })
    }
  })
}

export const sendMessageToBackground = (message) => {
    chrome.runtime.sendMessage(message,(response) => {
        if (chrome.runtime.lastError) {
            console.log('[ChromeUtils] 发送消息到background失败:', chrome.runtime.lastError)
        } else {
            console.log('[ChromeUtils] 发送消息到background成功:', response)
        }
    })
}
export const sendMessageToAllTabs = async (message) => {
  const tabs = await chrome.tabs.query({})
  const validTabs = tabs.filter(tab => {
    return tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))
  })
  let successCount = 0
  
  // 使用Promise.all等待所有消息发送完成
  const promises = validTabs.map(tab => {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          console.log(`Tab ${tab.id} 发送失败:`, chrome.runtime.lastError.message)
          resolve(false)
        } else {
          console.log(`Tab ${tab.id} 发送成功`)
          resolve(true)
        }
      })
    })
  })
  
  const results = await Promise.all(promises)
  successCount = results.filter(result => result === true).length
  
  return successCount
}
export const gotoUrl = async (url, tabeId ) => {
  try {
      // 跳转到指定URL
      await chrome.tabs.update(tabeId, { url: url })
  } catch (error) {
    console.error('[ChromeUtils] 跳转URL失败:', error)
  }
}
export const fetchUrl = (url, tabeId ) => {
  return new Promise((resolve, reject) => {
    fetch(url, {
      "headers": {
        "accept": "*/*",
        "accept-language": "zh-CN,zh;q=0.9",
        "sec-fetch-dest": "script",
        "sec-fetch-mode": "no-cors",
        "sec-fetch-site": "same-site"
      },
      "referrer": "https://cart.taobao.com",
      "body": null,
      "method": "GET",
      "mode": "cors",
      "credentials": "include"
    }).then(res => res.text()).then(data => resolve(data)).catch(error => reject(error))
  })
}

export const getUA = async () => {
  return navigator.userAgent
}
export const getCookieStr = (domain) => {
  return new Promise((resolve,reject) => {
      chrome.cookies.getAll({domain: domain}, function(cookies) {
        console.log('[ChromeUtils] 获取Cookie:', cookies)
          resolve(cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; '))
      })
  })
}
// 设置cookie
export const setCookie = (domain, name, value, expirationTime=60*25) => {
  // 自动处理域名格式，确保使用顶级域名
  let cookieDomain = domain
  if (domain.includes('://')) {
    // 如果是完整URL，提取域名
    const url = new URL(domain)
    cookieDomain = url.hostname
  }
  
  // 如果是子域名，转换为顶级域名
  if (cookieDomain.startsWith('www.')) {
    cookieDomain = cookieDomain.replace('www.', '.')
  } else if (!cookieDomain.startsWith('.')) {
    // 如果不是顶级域名格式，添加点前缀
    cookieDomain = '.' + cookieDomain
  }
  if (name){
      const cookieDetails = {
          url: domain,
          name,
          value,
          domain: cookieDomain,
          expirationDate: Math.floor(Date.now() / 1000) + expirationTime, // 过期时间设置
          path: "/",
          secure: true
      };
      chrome.cookies.set(cookieDetails, (cookie) => {});
  }
}
export const setCookieStr = (domain, cookieStr) => {
  const cookies = cookieStr.replace(/\s/g, "").split(";")
  cookies.forEach(cookie => {
    const [name, value] = cookie.split("=")
    setCookie(domain, name, value)
  })
}
// 默认 User-Agent
export const setUserAgent = (tabId, customUserAgent) => {
  chrome.debugger.sendCommand({ tabId: tabId }, 'Emulation.setUserAgentOverride', { userAgent: customUserAgent }, () => {
    if (chrome.runtime.lastError) {
      console.log('[ChromeUtils] 设置User-Agent失败:', chrome.runtime.lastError)
    } else {
      console.log('[ChromeUtils] 设置User-Agent成功:', customUserAgent)
    }
  });
}
export const clearAll = () => {
  chrome.browsingData.remove({
      "since": 0
  }, {
      "appcache": true,
      "cache": true,
      "cookies": true,
      "fileSystems": true,
      "formData": true,
      "history": true,
      "indexedDB": true,
      "localStorage": true,
      "webSQL": true
  }, function(){});
}
export const screenshot = (tab_id) => {
  return new Promise((resolve, reject) => {
      let window_id;
      // 查看指定tab_id的windowId
      chrome.tabs.get(tab_id, function(tab) {
          window_id = tab.windowId;
          // 截图 : 指定windowId
          chrome.tabs.captureVisibleTab(window_id, {format: "png"}, function(screenshotUrl) {
              resolve(screenshotUrl)
          });
      });
  })
}


export const executeScript = (tab_id, func, args) => {
  return new Promise((resolve, reject) => {
      chrome.scripting.executeScript({
        target: { tabId: tab_id },
        func: func,
        args: args || []
      }, (results) => {
          resolve(results);
      });
  });
};