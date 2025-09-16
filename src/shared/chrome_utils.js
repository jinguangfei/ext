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