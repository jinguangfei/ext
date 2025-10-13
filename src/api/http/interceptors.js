import { getToken, removeToken } from '@/utils'
export function resolveResError(code, message) {
  switch (code) {
    case 400:
      message = message ?? '请求参数错误'
      break
    case 401:
      message = message ?? '登录已过期'
      break
    case 403:
      message = message ?? '没有权限'
      break
    case 404:
      message = message ?? '资源或接口不存在'
      break
    case 500:
      message = message ?? '服务器异常'
      break
    default:
      message = message ?? `【${code}】: 未知异常!`
      break
  }
  return message
}


export async function reqResolve(config) {
  // 处理不需要token的请求
  if (config.noNeedToken) {
    return config
  }

  const token = await getToken()
  if (token) {
    config.headers.token = config.headers.token || token
  }

  return config
}

export function reqReject(error) {
  return Promise.reject(error)
}

export function resResolve(response) {
  const { data, status, statusText } = response
  console.info("resResolve",data)
  console.info(response)
  if (data?.code !== 200) {
    const code = data?.code ?? status
    /** 根据code处理对应的操作，并返回处理后的message */
    const message = resolveResError(code, data?.msg ?? statusText)
    return Promise.reject({ code, message, error: data || response })
  }
  console.info("resResolve",data)
  return Promise.resolve(data)
}

export async function resReject(error) {
  if (!error || !error.response) {
    const code = error?.code
    /** 根据code处理对应的操作，并返回处理后的message */
    const message = resolveResError(code, error.message)
    console.info(message)
    return Promise.reject({ code, message, error })
  }
  const { data, status } = error.response

  if (data?.code === 401) {
    try {
      removeToken()
    } catch (error) {
      console.log('resReject error', error)
      return
    }
  }
  // 后端返回的response数据
  const code = data?.code ?? status
  const message = resolveResError(code, data?.msg ?? error.message)
  console.info(message)
  return Promise.reject({ code, message, error: error.response?.data || error.response })
}
