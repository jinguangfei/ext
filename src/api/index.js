import { request } from './http'
export const api = {
    // 登录相关
    // 用户相关 
    // 配置相关
    // 任务相关
    getTask: (data = {}) => request.post('/chrome_ext/get_task', data),
    overTask: (data = {}) => request.post('/chrome_ext/over_task', data),
}
