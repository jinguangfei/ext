/**
 * 测试脚本：查看所有通过数据库存储的数据
 * 在Chrome扩展的popup或content script中运行
 */

import { DatabaseClient, dbExamples } from './src/popup/db-utils.js'

// 测试数据存储
async function testDataStorage() {
  console.log('=== 开始测试数据存储 ===')
  
  try {
    // 存储一些测试数据
    await DatabaseClient.set('test_string', 'Hello World', 'local')
    await DatabaseClient.set('test_number', 42, 'local')
    await DatabaseClient.set('test_object', { name: 'Test', value: 123 }, 'local')
    await DatabaseClient.set('test_array', [1, 2, 3, 4, 5], 'local')
    
    // 存储到sync
    await DatabaseClient.set('sync_data', 'Sync Data', 'sync')
    
    // 存储到session
    await DatabaseClient.set('session_data', 'Session Data', 'session')
    
    console.log('测试数据存储完成')
  } catch (error) {
    console.error('存储测试数据失败:', error)
  }
}

// 查看所有存储的数据
async function viewAllStoredData() {
  console.log('=== 查看所有存储的数据 ===')
  
  try {
    // 方法1: 使用dbExamples.viewAllStorageData()
    const allData = await dbExamples.viewAllStorageData()
    console.log('所有存储数据:', allData)
    
    // 方法2: 分别查看每种存储类型
    console.log('\n=== 分别查看各存储类型 ===')
    
    const localData = await DatabaseClient.listAll('local')
    console.log('Local存储:', localData)
    
    const syncData = await DatabaseClient.listAll('sync')
    console.log('Sync存储:', syncData)
    
    const sessionData = await DatabaseClient.listAll('session')
    console.log('Session存储:', sessionData)
    
  } catch (error) {
    console.error('查看存储数据失败:', error)
  }
}

// 清理测试数据
async function cleanupTestData() {
  console.log('=== 清理测试数据 ===')
  
  try {
    // 删除local存储的测试数据
    await DatabaseClient.delete('test_string', 'local')
    await DatabaseClient.delete('test_number', 'local')
    await DatabaseClient.delete('test_object', 'local')
    await DatabaseClient.delete('test_array', 'local')
    
    // 删除sync存储的测试数据
    await DatabaseClient.delete('sync_data', 'sync')
    
    // 删除session存储的测试数据
    await DatabaseClient.delete('session_data', 'session')
    
    console.log('测试数据清理完成')
  } catch (error) {
    console.error('清理测试数据失败:', error)
  }
}

// 主函数
async function main() {
  console.log('Chrome扩展数据库存储查看器')
  console.log('========================')
  
  // 1. 存储测试数据
  await testDataStorage()
  
  // 2. 查看所有存储的数据
  await viewAllStoredData()
  
  // 3. 清理测试数据（可选）
  // await cleanupTestData()
  
  console.log('========================')
  console.log('测试完成')
}

// 导出函数供其他模块使用
export {
  testDataStorage,
  viewAllStoredData,
  cleanupTestData,
  main
}

// 如果直接运行此脚本
if (typeof window !== 'undefined') {
  // 在浏览器环境中运行
  window.testStorage = {
    testDataStorage,
    viewAllStoredData,
    cleanupTestData,
    main
  }
  
  console.log('测试函数已挂载到 window.testStorage')
  console.log('使用方法:')
  console.log('- window.testStorage.main() // 运行完整测试')
  console.log('- window.testStorage.viewAllStoredData() // 只查看数据')
  console.log('- window.testStorage.testDataStorage() // 只存储测试数据')
  console.log('- window.testStorage.cleanupTestData() // 只清理数据')
}
