/**
 * SidePanel专用数据库工具类 - 重新导出公用工具类
 */

// 从公用模块导入
export { DatabaseClient, dbExamples } from '../shared/db-utils.js'

// SidePanel专用示例（基于公用工具类）
export const sidePanelDbExamples = {
  // 示例1: 保存sidepanel设置
  async saveSidePanelSettings(settings) {
    try {
      await DatabaseClient.set('sidePanelSettings', settings)
      console.log('SidePanel设置已保存')
    } catch (error) {
      console.error('保存SidePanel设置失败:', error)
    }
  },

  // 示例2: 获取sidepanel设置
  async getSidePanelSettings() {
    try {
      const settings = await DatabaseClient.get('sidePanelSettings')
      return settings || {}
    } catch (error) {
      console.error('获取SidePanel设置失败:', error)
      return {}
    }
  },

  // 示例3: 保存sidepanel计数器
  async saveSidePanelCount(count) {
    try {
      await DatabaseClient.set('sidePanelCount', count)
    } catch (error) {
      console.error('保存SidePanel计数器失败:', error)
    }
  },

  // 示例4: 获取sidepanel计数器
  async getSidePanelCount() {
    try {
      const count = await DatabaseClient.get('sidePanelCount')
      return count || 0
    } catch (error) {
      console.error('获取SidePanel计数器失败:', error)
      return 0
    }
  },

  // 示例5: 监听sidepanel计数器变化
  listenSidePanelCountChanges(callback) {
    return DatabaseClient.listen('sidePanelCount', callback)
  },

  // 示例6: 查看所有存储的数据
  async viewAllData(storageType = 'local', keyword = null) {
    try {
      const result = await DatabaseClient.listAll(storageType, keyword)
      console.log(`=== SidePanel ${storageType} 存储数据${keyword ? ` (过滤: ${keyword})` : ''} ===`)
      console.log(`数据总数: ${result.count}`)
      console.log('数据内容:', result.data)
      return result
    } catch (error) {
      console.error('获取所有数据失败:', error)
      return null
    }
  },

  // 示例7: 查看所有存储类型的数据
  async viewAllStorageData() {
    const results = {}
    
    try {
      // 查看local存储
      results.local = await DatabaseClient.listAll('local')
      
      // 查看sync存储
      results.sync = await DatabaseClient.listAll('sync')
      
      // 查看session存储
      results.session = await DatabaseClient.listAll('session')
      
      console.log('=== SidePanel 所有存储数据汇总 ===')
      console.log(`Local存储: ${results.local.count} 项`)
      console.log(`Sync存储: ${results.sync.count} 项`)
      console.log(`Session存储: ${results.session.count} 项`)
      
      return results
    } catch (error) {
      console.error('获取所有存储数据失败:', error)
      return null
    }
  },

  // 示例8: 按关键词搜索SidePanel数据
  async searchSidePanelData(keyword, storageType = 'local') {
    try {
      const result = await DatabaseClient.listAll(storageType, keyword)
      console.log(`=== SidePanel 搜索关键词: ${keyword} ===`)
      console.log(`匹配结果: ${result.count} 项`)
      console.log('匹配数据:', result.data)
      return result
    } catch (error) {
      console.error('搜索SidePanel数据失败:', error)
      return null
    }
  }
}
