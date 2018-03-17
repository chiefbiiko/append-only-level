// TODO: make sure errors are being passed, level-errors

var Readable = require('readable-stream')
var debug = require('debug')('append-only-level')

function Log (db) {
  if (!(this instanceof Log)) return new Log(db)
  else if (!db) throw Error('levelup instance required')
  this._db = db
  this._head = -1
}

function count () {
  return this._head + 1
}

Log.prototype.__defineGetter__('size', count)
Log.prototype.__defineGetter__('length', count)

Log.prototype.append = function append (value, cb) {
  var self = this
  self._db.put(String(++self._head), value, function (err) {
    if (err) return cb.call(self, err)
    cb.call(self, null, self._head)
  })
}

Log.prototype.get = function get (key, cb) {
  this._db.get(String(key), cb.bind(this))
}

Log.prototype.createReadStream = function createReadStream (opts) {
  return this._db.createReadStream(opts || {})
}

var LIVE_OPTS = { limit: -1, keys: true, values: true }
// not-allowed: opts.reverse

Log.prototype.createLiveStream = function createLiveStream (opts) {
  var self = this
  opts = Object.assign(LIVE_OPTS, opts || {})
  opts.lt = parseInt(opts.lt) || -1
  opts.lte = parseInt(opts.lte) || -99
  var live = new Readable({
    objectMode: true,
    read () {
      var that = this
      debug('that._head, self._head::', that._head, self._head)
      if (that._head >= self._head) return
      if (that._head === (opts.limit - 1) ||
          that._head === (opts.lt - 1) ||
          that._head === opts.lte) {
        debug('::done::')
        that._done = true
        return
      }
      debug('gettin::', that._head + 1)
      self.get(++that._head, function (err, value) {
        if (err) return that.emit('error', err)
        debug('value::', value)
        var payload
        if (opts.keys && !opts.values) payload = String(that._head)
        else if (opts.values && !opts.keys) payload = value
        else payload = { key: String(that._head), value: value }
        var more = that.push(payload)
        debug('that._done, more::', that._done, more)
        if (that._done) that.push(null)
        else if (more) that._read()
      })
    }
  })
  live._head = parseInt(opts.gt) || (parseInt(opts.gte) - 1) || -1
  return live
}

module.exports = Log
