import { request } from './http'
export default {
    // 登录相关
    // 用户相关 
    // 配置相关
    configList: (params = {}) => request.get('/config/list', { params }),
    configCurrent: (params = {}) => request.get('/config/current', { params }),
}
