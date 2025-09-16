/**
 * 公用数据库工具类 - 用于popup、sidepanel和其他页面与数据库交互
 */
// 定义数据库操作协议
const DB_PROTOCOL = {
  
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

// 数据库操作工具类
export class DatabaseClient {
  /**
   * 设置数据到chrome.storage
   * @param {string} key - 数据键
   * @param {any} value - 数据值
   * @param {string} storageType - 存储类型 ('sync', 'local', 'session')
   */
  static async set(key, value, storageType = 'local') {
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
   * @param {string} key - 数据键
   * @param {string} storageType - 存储类型
   */
  static async get(key, storageType = 'local') {
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
   * @param {string} key - 数据键
   * @param {string} storageType - 存储类型
   */
  static async delete(key, storageType = 'local') {
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
   * @param {string} storageType - 存储类型
   */
  static async clear(storageType = 'local') {
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
  static async listAll(storageType = 'local', keyword = null) {
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
   * 监听数据变化
   * @param {string} key - 要监听的数据键
   * @param {function} callback - 变化回调函数
   */
  static listen(key, callback) {
    // 设置chrome.storage变化监听
    const storageListener = (changes, areaName) => {
      // 验证存储区域名称
      if (!Object.values(DB_PROTOCOL.STORAGE_TYPES).includes(areaName)) {
        return
      }

      const prefix = DB_PROTOCOL.METADATA.PREFIX
      const dbKey = prefix + key

      // 检查是否是目标数据的变化
      if (changes[dbKey]) {
        callback({
          key: key,
          newValue: changes[dbKey].newValue,
          oldValue: changes[dbKey].oldValue,
          areaName: areaName
        })
      }
    }

    chrome.storage.onChanged.addListener(storageListener)

    // 返回取消监听的函数
    return () => {
      chrome.storage.onChanged.removeListener(storageListener)
    }
  }
  static listenKeyword(keyword, callback) {
    const storageListener = (changes, areaName) => {
      // 验证存储区域名称
      if (!Object.values(DB_PROTOCOL.STORAGE_TYPES).includes(areaName)) {
        return
      }
      const prefix = DB_PROTOCOL.METADATA.PREFIX + keyword
      for (const [key, change] of Object.entries(changes)) {
        if (key.startsWith(prefix)) {
          const originalKey = key.substring(DB_PROTOCOL.METADATA.PREFIX.length)
          callback({
            key: originalKey,
            newValue: change.newValue,
            oldValue: change.oldValue,
            areaName: areaName
          })
        }
      }
    }
    chrome.storage.onChanged.addListener(storageListener)
    return () => {
      chrome.storage.onChanged.removeListener(storageListener)
    }
  }
}