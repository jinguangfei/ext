// 阻止特定域名的请求
const BLOCKED_DOMAIN = 'pc-growht-rta.taobao.com'
const BLOCKED_PATH = '/rta/360redirect'

// 在扩展安装或启动时设置阻止规则
chrome.runtime.onInstalled.addListener(() => {
  setupBlockingRules()
})

chrome.runtime.onStartup.addListener(() => {
  setupBlockingRules()
})

async function setupBlockingRules() {
  try {
    // 获取现有的规则
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules()
    
    // 检查是否已经存在该规则
    const ruleId = 1000 // 使用一个固定的规则ID
    const hasRule = existingRules.some(rule => rule.id === ruleId)
    
    if (!hasRule) {
      // 创建阻止规则
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [{
          id: ruleId,
          priority: 1,
          action: {
            type: 'block'
          },
          condition: {
            urlFilter: `*://${BLOCKED_DOMAIN}${BLOCKED_PATH}*`,
            resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'stylesheet', 'image', 'font', 'object', 'ping', 'csp_report', 'media', 'websocket', 'other']
          }
        }],
        removeRuleIds: []
      })
      console.log(`[Background] ✅ 已添加阻止规则: ${BLOCKED_DOMAIN}${BLOCKED_PATH}`)
    }
  } catch (error) {
    console.error('[Background] ❌ 设置阻止规则失败:', error)
  }
}

