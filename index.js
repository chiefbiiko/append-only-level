// TODO: size and live stream
var isString = require('util').isString
// opts.valueEncoding: binary, json, utf8
function Log (db, opts) {
  if (!(this instanceof Log)) return new Log(db, opts)
  if (!db) throw Error('levelup instance required')
  else if (!opts) opts = {}
  this._db = db
  this._opts = {}
  this._head = -1
  this._valueEncoding = opts.valueEncoding
}

Log.prototype.append = function append (value, cb) {
  var self = this
  this._db.put(String(++this._head), value, this._opts, function (err) {
    if (err) return cb(err)
    cb(null, self._head)
  })
}

Log.prototype.get = function get (key, cb) {
  this._db.get(String(key), this._opts, cb)
}

Log.prototype.createReadStream = function createReadStream (opts) {
  if (!opts) opts = {}
  return this._db.createReadStream({
    gt: opts.since || 0,
    lt: opts.until || -1,
    valueEncoding: this._valueEncoding,
    reverse: opts.reverse,
    limit: opts.limit
  })
}

module.exports = Log
