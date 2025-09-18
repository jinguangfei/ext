import { request } from './http'
export const api = {
    // 登录相关
    // 用户相关 
    // 配置相关
    configCurrent: (params = {}) => request.get('/config/current', { params }),
    // 任务相关
    configGetTask: () => request.post('/config/get_task'),
    configOverTask: (data = {}) => request.post('/config/over_task', data),
}
