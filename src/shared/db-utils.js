/**
 * 公用数据库工具类 - 用于popup、sidepanel和其他页面与数据库交互
 */

// 数据库操作工具类
export class DatabaseClient {
  /**
   * 设置数据
   * @param {string} key - 数据键
   * @param {any} value - 数据值
   * @param {string} storageType - 存储类型 ('sync', 'local', 'session')
   */
  static async set(key, value, storageType = 'local') {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'DB_SET',
        key: key,
        value: value,
        storageType: storageType
      }, (response) => {
        if (response && response.success) {
          resolve(response.data)
        } else {
          reject(new Error(response?.error || 'Unknown error'))
        }
      })
    })
  }

  /**
   * 获取数据
   * @param {string} key - 数据键
   * @param {string} storageType - 存储类型
   */
  static async get(key, storageType = 'local') {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'DB_GET',
        key: key,
        storageType: storageType
      }, (response) => {
        if (response && response.success) {
          resolve(response.data)
        } else {
          reject(new Error(response?.error || 'Unknown error'))
        }
      })
    })
  }

  /**
   * 删除数据
   * @param {string} key - 数据键
   * @param {string} storageType - 存储类型
   */
  static async delete(key, storageType = 'local') {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'DB_DELETE',
        key: key,
        storageType: storageType
      }, (response) => {
        if (response && response.success) {
          resolve(response.data)
        } else {
          reject(new Error(response?.error || 'Unknown error'))
        }
      })
    })
  }

  /**
   * 清空存储
   * @param {string} storageType - 存储类型
   */
  static async clear(storageType = 'local') {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'DB_CLEAR',
        storageType: storageType
      }, (response) => {
        if (response && response.success) {
          resolve(response.data)
        } else {
          reject(new Error(response?.error || 'Unknown error'))
        }
      })
    })
  }

  /**
   * 列出所有存储的数据
   * @param {string} storageType - 存储类型
   * @param {string} keyword - 可选的过滤关键词
   */
  static async listAll(storageType = 'local', keyword = null) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'DB_LIST',
        storageType: storageType,
        keyword: keyword
      }, (response) => {
        if (response && response.success) {
          resolve(response.data)
        } else {
          reject(new Error(response?.error || 'Unknown error'))
        }
      })
    })
  }

  /**
   * 监听数据变化
   * @param {string} key - 要监听的数据键
   * @param {function} callback - 变化回调函数
   */
  static listen(key, callback) {
    // 设置消息监听
    const messageListener = (request) => {
      if (request.type === 'DB_CHANGE' && request.key === key) {
        callback({
          key: request.key,
          newValue: request.newValue,
          oldValue: request.oldValue,
          areaName: request.areaName
        })
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)

    // 返回取消监听的函数
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }
}

// 使用示例
export const dbExamples = {
  // 示例1: 保存用户设置
  async saveUserSettings(settings) {
    try {
      await DatabaseClient.set('userSettings', settings)
      console.log('用户设置已保存')
    } catch (error) {
      console.error('保存用户设置失败:', error)
    }
  },

  // 示例2: 获取用户设置
  async getUserSettings() {
    try {
      const settings = await DatabaseClient.get('userSettings')
      return settings || {}
    } catch (error) {
      console.error('获取用户设置失败:', error)
      return {}
    }
  },

  // 示例3: 监听计数器变化
  listenCountChanges(callback) {
    return DatabaseClient.listen('count', callback)
  },

  // 示例4: 保存计数器
  async saveCount(count) {
    try {
      await DatabaseClient.set('count', count)
    } catch (error) {
      console.error('保存计数器失败:', error)
    }
  },

  // 示例5: 查看所有存储的数据
  async viewAllData(storageType = 'local', keyword = null) {
    try {
      const result = await DatabaseClient.listAll(storageType, keyword)
      console.log(`=== ${storageType} 存储数据${keyword ? ` (过滤: ${keyword})` : ''} ===`)
      console.log(`数据总数: ${result.count}`)
      console.log('数据内容:', result.data)
      return result
    } catch (error) {
      console.error('获取所有数据失败:', error)
      return null
    }
  },

  // 示例6: 查看所有存储类型的数据
  async viewAllStorageData() {
    const results = {}
    
    try {
      // 查看local存储
      results.local = await DatabaseClient.listAll('local')
      
      // 查看sync存储
      results.sync = await DatabaseClient.listAll('sync')
      
      // 查看session存储
      results.session = await DatabaseClient.listAll('session')
      
      console.log('=== 所有存储数据汇总 ===')
      console.log(`Local存储: ${results.local.count} 项`)
      console.log(`Sync存储: ${results.sync.count} 项`)
      console.log(`Session存储: ${results.session.count} 项`)
      
      return results
    } catch (error) {
      console.error('获取所有存储数据失败:', error)
      return null
    }
  },

  // 示例7: 按关键词过滤数据
  async searchData(keyword, storageType = 'local') {
    try {
      const result = await DatabaseClient.listAll(storageType, keyword)
      console.log(`=== 搜索关键词: ${keyword} ===`)
      console.log(`匹配结果: ${result.count} 项`)
      console.log('匹配数据:', result.data)
      return result
    } catch (error) {
      console.error('搜索数据失败:', error)
      return null
    }
  },

  // 示例8: 保存用户偏好
  async saveUserPreferences(preferences) {
    try {
      await DatabaseClient.set('userPreferences', preferences, 'sync')
      console.log('用户偏好已保存到sync存储')
    } catch (error) {
      console.error('保存用户偏好失败:', error)
    }
  },

  // 示例9: 获取用户偏好
  async getUserPreferences() {
    try {
      const preferences = await DatabaseClient.get('userPreferences', 'sync')
      return preferences || { theme: 'auto', language: 'zh-CN' }
    } catch (error) {
      console.error('获取用户偏好失败:', error)
      return { theme: 'auto', language: 'zh-CN' }
    }
  },

  // 示例10: 保存页面专用数据
  async savePageData(pageName, data) {
    try {
      await DatabaseClient.set(`${pageName}Data`, data)
      console.log(`${pageName}数据已保存`)
    } catch (error) {
      console.error(`保存${pageName}数据失败:`, error)
    }
  },

  // 示例11: 获取页面专用数据
  async getPageData(pageName) {
    try {
      const data = await DatabaseClient.get(`${pageName}Data`)
      return data || {}
    } catch (error) {
      console.error(`获取${pageName}数据失败:`, error)
      return {}
    }
  }
}
