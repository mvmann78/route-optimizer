import { proxyGet } from '../../_ors.js'
export default (req, res) => proxyGet('geocode/autocomplete', req, res)
