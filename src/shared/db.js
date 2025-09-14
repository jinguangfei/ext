/**
 * Chrome扩展数据库管理模块
 * 功能：
 * 1. 接收chrome.runtime消息
 * 2. 同步到chrome.storage
 * 3. 监听chrome.storage变化并发送消息
 */

// 定义数据库操作协议
const DB_PROTOCOL = {
  // 数据库操作类型
  OPERATIONS: {
    SET: 'DB_SET',           // 设置数据
    GET: 'DB_GET',           // 获取数据
    DELETE: 'DB_DELETE',     // 删除数据
    CLEAR: 'DB_CLEAR',       // 清空数据
    LIST: 'DB_LIST',         // 列出所有数据
  },
  
  // 存储区域类型
  STORAGE_TYPES: {
    SYNC: 'sync',            // 同步存储
    LOCAL: 'local',          // 本地存储
    SESSION: 'session',      // 会话存储
  },

  // 数据标识配置
  METADATA: {
    PREFIX: '__db_',         // 数据库数据前缀
  }
}

class DatabaseManager {
  constructor() {
    this.init()
  }

  /**
   * 初始化数据库管理器
   */
  init() {
    // 监听chrome.runtime消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse)
      return true // 保持消息通道开放
    })

    // 监听chrome.storage变化
    chrome.storage.onChanged.addListener((changes, areaName) => {
      this.handleStorageChange(changes, areaName)
    })

    console.log('Database Manager initialized')
  }

  /**
   * 处理chrome.runtime消息
   */
  async handleMessage(request, sender, sendResponse) {
    const { type, operation, key, value, storageType = DB_PROTOCOL.STORAGE_TYPES.LOCAL, keyword } = request

    // 只处理数据库相关的消息
    if (!Object.values(DB_PROTOCOL.OPERATIONS).includes(type)) {
      return
    }

    try {

      let result

      switch (type) {
        case DB_PROTOCOL.OPERATIONS.SET:
          if (!key || value === undefined) {
            throw new Error('SET operation requires key and value')
          }
          result = await this.setData(key, value, storageType)
          break

        case DB_PROTOCOL.OPERATIONS.GET:
          if (!key) {
            throw new Error('GET operation requires key')
          }
          result = await this.getData(key, storageType)
          break

        case DB_PROTOCOL.OPERATIONS.DELETE:
          if (!key) {
            throw new Error('DELETE operation requires key')
          }
          result = await this.deleteData(key, storageType)
          break

        case DB_PROTOCOL.OPERATIONS.CLEAR:
          result = await this.clearData(storageType)
          break

        case DB_PROTOCOL.OPERATIONS.LIST:
          result = await this.listAllData(storageType, keyword)
          break

        default:
          throw new Error(`Unknown operation: ${type}`)
      }

      // 发送响应
      sendResponse({ success: true, data: result })
    } catch (error) {
      console.error('Database operation failed:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  /**
   * 设置数据到chrome.storage
   */
  async setData(key, value, storageType) {
    // 验证存储类型
    if (!Object.values(DB_PROTOCOL.STORAGE_TYPES).includes(storageType)) {
      throw new Error(`Invalid storage type: ${storageType}`)
    }

    const storage = chrome.storage[storageType]
    
    // 使用前缀标识数据来源
    const dbKey = DB_PROTOCOL.METADATA.PREFIX + key
    const data = { [dbKey]: value }
    
    await storage.set(data)
    console.log(`Data set: ${key} = ${JSON.stringify(value)} in ${storageType}`)
    
    return { key, value }
  }

  /**
   * 从chrome.storage获取数据
   */
  async getData(key, storageType) {
    // 验证存储类型
    if (!Object.values(DB_PROTOCOL.STORAGE_TYPES).includes(storageType)) {
      throw new Error(`Invalid storage type: ${storageType}`)
    }

    const storage = chrome.storage[storageType]
    
    // 使用前缀查找数据
    const dbKey = DB_PROTOCOL.METADATA.PREFIX + key
    const result = await storage.get(dbKey)
    const data = result[dbKey]
    
    console.log(`Data get: ${key} = ${JSON.stringify(data)} from ${storageType}`)
    return data
  }

  /**
   * 从chrome.storage删除数据
   */
  async deleteData(key, storageType) {
    // 验证存储类型
    if (!Object.values(DB_PROTOCOL.STORAGE_TYPES).includes(storageType)) {
      throw new Error(`Invalid storage type: ${storageType}`)
    }

    const storage = chrome.storage[storageType]
    
    // 使用前缀删除数据
    const dbKey = DB_PROTOCOL.METADATA.PREFIX + key
    await storage.remove(dbKey)
    
    console.log(`Data deleted: ${key} from ${storageType}`)
    
    return { key }
  }

  /**
   * 清空chrome.storage
   */
  async clearData(storageType) {
    // 验证存储类型
    if (!Object.values(DB_PROTOCOL.STORAGE_TYPES).includes(storageType)) {
      throw new Error(`Invalid storage type: ${storageType}`)
    }

    const storage = chrome.storage[storageType]
    await storage.clear()
    
    console.log(`Storage cleared: ${storageType}`)
    
    return { cleared: true }
  }

  /**
   * 列出所有通过db.js存储的数据
   * @param {string} storageType - 存储类型
   * @param {string} keyword - 可选的过滤关键词
   */
  async listAllData(storageType, keyword = null) {
    // 验证存储类型
    if (!Object.values(DB_PROTOCOL.STORAGE_TYPES).includes(storageType)) {
      throw new Error(`Invalid storage type: ${storageType}`)
    }

    const storage = chrome.storage[storageType]
    const allData = await storage.get(null) // null表示获取所有数据
    
    // 过滤出通过db.js存储的数据（通过前缀识别）
    const dbData = {}
    const prefix = DB_PROTOCOL.METADATA.PREFIX
    
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith(prefix)) {
        // 移除前缀，恢复原始键名
        const originalKey = key.substring(prefix.length)
        
        // 如果提供了keyword，进行过滤
        if (keyword) {
          // 检查键名是否包含关键词（不区分大小写）
          const keyMatch = originalKey.toLowerCase().includes(keyword.toLowerCase())
          
          if (keyMatch) {
            dbData[originalKey] = value
          }
        } else {
          // 没有keyword时，返回所有数据
          dbData[originalKey] = value
        }
      }
    }
    
    console.log(`DB data in ${storageType}${keyword ? ` (filtered by: ${keyword})` : ''}:`, dbData)
    
    return {
      storageType: storageType,
      keyword: keyword,
      data: dbData,
      count: Object.keys(dbData).length
    }
  }


  /**
   * 处理chrome.storage变化
   */
  handleStorageChange(changes, areaName) {
    console.log(`Storage changed in ${areaName}:`, changes)

    // 验证存储区域名称
    if (!Object.values(DB_PROTOCOL.STORAGE_TYPES).includes(areaName)) {
      console.warn(`Unknown storage area: ${areaName}`)
      return
    }

    const prefix = DB_PROTOCOL.METADATA.PREFIX

    // 遍历所有变化的数据
    for (const [key, change] of Object.entries(changes)) {
      try {
        // 检查是否是db.js数据的变化（通过前缀识别）
        if (key.startsWith(prefix)) {
          // 移除前缀，恢复原始键名
          const originalKey = key.substring(prefix.length)
          
          chrome.runtime.sendMessage({
            type: 'DB_CHANGE',
            key: originalKey,
            newValue: change.newValue,
            oldValue: change.oldValue,
            areaName: areaName
          }).catch(error => {
            console.log('No popup to send message to:', error.message)
          })
        }
      } catch (error) {
        console.error('Error sending storage change message:', error)
      }
    }
  }

}

// 创建数据库管理器实例
const dbManager = new DatabaseManager()

// 导出协议常量供其他模块使用
export { DB_PROTOCOL }
export default dbManager
