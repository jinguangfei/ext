/**
 * 公共工具函数集合
 */

/**
 * 防抖函数 - 在事件被触发n秒后再执行回调，如果在这n秒内又被触发，则重新计时
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @param {boolean} immediate - 是否立即执行第一次调用
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, delay = 300, immediate = false) {
  let timeoutId = null
  
  return function executedFunction(...args) {
    const later = () => {
      timeoutId = null
      if (!immediate) func.apply(this, args)
    }
    
    const callNow = immediate && !timeoutId
    
    clearTimeout(timeoutId)
    timeoutId = setTimeout(later, delay)
    
    if (callNow) func.apply(this, args)
  }
}

/**
 * 节流函数 - 规定在一个单位时间内，只能触发一次函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit = 300) {
  let inThrottle = false
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 防抖装饰器 - 用于类方法
 * @param {number} delay - 延迟时间（毫秒）
 * @param {boolean} immediate - 是否立即执行第一次调用
 * @returns {Function} 装饰器函数
 */
export function debounceDecorator(delay = 300, immediate = false) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value
    descriptor.value = debounce(originalMethod, delay, immediate)
    return descriptor
  }
}

/**
 * 节流装饰器 - 用于类方法
 * @param {number} limit - 时间间隔（毫秒）
 * @returns {Function} 装饰器函数
 */
export function throttleDecorator(limit = 300) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value
    descriptor.value = throttle(originalMethod, limit)
    return descriptor
  }
}

/**
 * 创建防抖的Promise - 防抖版本的异步函数
 * @param {Function} asyncFunc - 异步函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖的异步函数
 */
export function debounceAsync(asyncFunc, delay = 300) {
  let timeoutId = null
  let currentPromise = null
  
  return function(...args) {
    return new Promise((resolve, reject) => {
      clearTimeout(timeoutId)
      
      timeoutId = setTimeout(async () => {
        try {
          if (currentPromise) {
            // 取消之前的请求
            currentPromise = null
          }
          
          currentPromise = asyncFunc.apply(this, args)
          const result = await currentPromise
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, delay)
    })
  }
}

/**
 * 创建节流的Promise - 节流版本的异步函数
 * @param {Function} asyncFunc - 异步函数
 * @param {number} limit - 时间间隔（毫秒）
 * @returns {Function} 节流的异步函数
 */
export function throttleAsync(asyncFunc, limit = 300) {
  let inThrottle = false
  let lastPromise = null
  
  return function(...args) {
    return new Promise((resolve, reject) => {
      if (!inThrottle) {
        inThrottle = true
        
        lastPromise = asyncFunc.apply(this, args)
        lastPromise.then(resolve).catch(reject)
        
        setTimeout(() => {
          inThrottle = false
        }, limit)
      } else {
        // 在节流期间，返回最后一个Promise的结果
        if (lastPromise) {
          lastPromise.then(resolve).catch(reject)
        }
      }
    })
  }
}

/**
 * 批量防抖 - 对多个函数进行防抖处理
 * @param {Object} functions - 函数对象
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Object} 防抖后的函数对象
 */
export function debounceBatch(functions, delay = 300) {
  const debouncedFunctions = {}
  
  for (const [key, func] of Object.entries(functions)) {
    debouncedFunctions[key] = debounce(func, delay)
  }
  
  return debouncedFunctions
}

/**
 * 批量节流 - 对多个函数进行节流处理
 * @param {Object} functions - 函数对象
 * @param {number} limit - 时间间隔（毫秒）
 * @returns {Object} 节流后的函数对象
 */
export function throttleBatch(functions, limit = 300) {
  const throttledFunctions = {}
  
  for (const [key, func] of Object.entries(functions)) {
    throttledFunctions[key] = throttle(func, limit)
  }
  
  return throttledFunctions
}

/**
 * 智能防抖 - 根据函数执行时间动态调整防抖延迟
 * @param {Function} func - 要防抖的函数
 * @param {number} baseDelay - 基础延迟时间（毫秒）
 * @param {number} maxDelay - 最大延迟时间（毫秒）
 * @returns {Function} 智能防抖后的函数
 */
export function smartDebounce(func, baseDelay = 300, maxDelay = 1000) {
  let timeoutId = null
  let executionTimes = []
  
  return function executedFunction(...args) {
    clearTimeout(timeoutId)
    
    const now = Date.now()
    const avgExecutionTime = executionTimes.length > 0 
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length 
      : 0
    
    // 根据平均执行时间调整延迟
    const dynamicDelay = Math.min(
      baseDelay + avgExecutionTime * 2,
      maxDelay
    )
    
    timeoutId = setTimeout(() => {
      const startTime = Date.now()
      func.apply(this, args)
      const executionTime = Date.now() - startTime
      
      // 记录执行时间
      executionTimes.push(executionTime)
      if (executionTimes.length > 10) {
        executionTimes.shift() // 只保留最近10次的执行时间
      }
    }, dynamicDelay)
  }
}

/**
 * 条件防抖 - 根据条件决定是否执行防抖
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @param {Function} condition - 条件函数，返回true时执行防抖
 * @returns {Function} 条件防抖后的函数
 */
export function conditionalDebounce(func, delay = 300, condition = () => true) {
  let timeoutId = null
  
  return function executedFunction(...args) {
    if (!condition.apply(this, args)) {
      // 条件不满足时，立即执行
      clearTimeout(timeoutId)
      func.apply(this, args)
      return
    }
    
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func.apply(this, args)
    }, delay)
  }
}

/**
 * 格式化数据大小
 * @param {any} data - 要计算大小的数据
 * @returns {string} 格式化后的大小字符串
 */
export function formatDataSize(data) {
  if (!data) return '0 B'
  
  let size = 0
  if (typeof data === 'string') {
    size = new Blob([data]).size
  } else {
    size = new Blob([JSON.stringify(data)]).size
  }
  
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * 下载数据到本地文件
 * @param {any} data - 要下载的数据
 * @param {string} filename - 文件名（可选）
 * @param {Function} onSuccess - 成功回调函数（可选）
 * @param {Function} onError - 错误回调函数（可选）
 */
export function downloadData(data, filename, onSuccess, onError) {
  try {
    let content = ''
    let mimeType = 'text/plain'
    
    if (typeof data === 'string') {
      content = data
      mimeType = 'text/plain'
    } else {
      content = JSON.stringify(data, null, 2)
      mimeType = 'application/json'
    }
    
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `data_${Date.now()}.${mimeType === 'application/json' ? 'json' : 'txt'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    if (onSuccess) onSuccess('数据下载成功')
  } catch (error) {
    console.error('下载失败:', error)
    if (onError) onError('下载失败: ' + error.message)
  }
}

/**
 * 批量下载多个数据文件
 * @param {Array} dataList - 数据列表，每个元素包含 {data, filename}
 * @param {Function} onProgress - 进度回调函数（可选）
 * @param {Function} onComplete - 完成回调函数（可选）
 */
export function downloadBatch(dataList, onProgress, onComplete) {
  let completed = 0
  const total = dataList.length
  
  dataList.forEach((item, index) => {
    setTimeout(() => {
      downloadData(
        item.data,
        item.filename,
        () => {
          completed++
          if (onProgress) onProgress(completed, total)
          if (completed === total && onComplete) onComplete()
        },
        (error) => {
          completed++
          if (onProgress) onProgress(completed, total, error)
          if (completed === total && onComplete) onComplete()
        }
      )
    }, index * 100) // 每个文件间隔100ms下载
  })
}

/**
 * 创建下载链接（不自动下载）
 * @param {any} data - 要下载的数据
 * @param {string} filename - 文件名（可选）
 * @returns {string} 下载链接URL
 */
export function createDownloadLink(data, filename) {
  try {
    let content = ''
    let mimeType = 'text/plain'
    
    if (typeof data === 'string') {
      content = data
      mimeType = 'text/plain'
    } else {
      content = JSON.stringify(data, null, 2)
      mimeType = 'application/json'
    }
    
    const blob = new Blob([content], { type: mimeType })
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('创建下载链接失败:', error)
    return null
  }
}

/**
 * 使用示例
 */
export const utilsExamples = {
  // 示例1: 基本防抖
  basicDebounce() {
    const searchInput = document.getElementById('search')
    const debouncedSearch = debounce((value) => {
      console.log('搜索:', value)
    }, 500)
    
    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value)
    })
  },

  // 示例2: 基本节流
  basicThrottle() {
    const scrollHandler = throttle(() => {
      console.log('滚动事件')
    }, 100)
    
    window.addEventListener('scroll', scrollHandler)
  },

  // 示例3: 防抖的异步函数
  asyncDebounce() {
    const debouncedApiCall = debounceAsync(async (query) => {
      const response = await fetch(`/api/search?q=${query}`)
      return response.json()
    }, 300)
    
    // 使用
    debouncedApiCall('test').then(result => {
      console.log('搜索结果:', result)
    })
  },

  // 示例4: 批量处理
  batchProcessing() {
    const functions = {
      save: (data) => console.log('保存:', data),
      validate: (data) => console.log('验证:', data),
      submit: (data) => console.log('提交:', data)
    }
    
    const debouncedFunctions = debounceBatch(functions, 500)
    
    // 使用
    debouncedFunctions.save('data1')
    debouncedFunctions.validate('data1')
    debouncedFunctions.submit('data1')
  },

  // 示例5: 智能防抖
  smartDebounceExample() {
    const smartDebouncedFunction = smartDebounce((data) => {
      // 模拟耗时操作
      const start = Date.now()
      while (Date.now() - start < 100) {}
      console.log('处理数据:', data)
    }, 200, 800)
    
    // 使用
    smartDebouncedFunction('data1')
    smartDebouncedFunction('data2')
  },

  // 示例6: 条件防抖
  conditionalDebounceExample() {
    const conditionalDebouncedFunction = conditionalDebounce(
      (value) => console.log('处理:', value),
      300,
      (value) => value.length > 3 // 只有长度大于3时才防抖
    )
    
    // 使用
    conditionalDebouncedFunction('ab')    // 立即执行
    conditionalDebouncedFunction('abcd') // 防抖执行
  }
}
