export const OBSERVED_CONFIG = 'OBSERVED_CONFIG'
export const OBSERVED_RESPONSE = 'OBSERVED_RESPONSE'
export const UPLOAD_OBSERVED_RESPONSE = 'UPLOAD_OBSERVED_RESPONSE'

export const OBSERVED_TYPE = {
  XHR: 'xhr',
  HTML: 'html',
  NETWORK: 'network'
}

export function gen_observed_response(config, url, response) {
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
function shouldObserveConfig(config, type) {
  if (!config) return false
  if (config.type !== type) {
    return false
  }
  return true
}

export function shouldObserveRequest(config, url, requestData, type) {
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

export function shouldObserveResponse(config, url, requestData, responseData, type) {
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