import { proxyPost } from '../../../../_ors.js'
export default (req, res) => proxyPost('v2/directions/driving-car/geojson', req, res)
