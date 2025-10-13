import { request } from '../http/index.js'

export default {
    login: (data) => request.post('/admin/base/access_token', data, { noNeedToken: true }),
    getUserInfo: () => request.get('/admin/base/userinfo'),
    // account info
    getAccountInfo: (params = {}) => request.get('/admin/account/info/', { params }),
    // account cost
    getCostList: (params = {}) => request.get('/admin/account/cost/list', { params }),
}
