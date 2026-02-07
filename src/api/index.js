import { request } from './http/index.js'
import admin from './admin'
export const api = {
    // 登录相关
    ...admin,
    // 用户相关 
    // 配置相关
    // 任务相关
    getTask: (data = {}) => request.post('/api/ext_call/get_task', data),
    overTask: (data = {}) => request.post('/api/ext_call/over_task', data),
}
