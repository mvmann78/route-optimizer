import { proxyPost } from '../../../_ors.js'
export default (req, res) => proxyPost('v2/matrix/driving-car', req, res)
