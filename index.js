// TODO: live stream, pass thru error events, level-errors

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
  this._db.put(String(++this._head), value, function (err) {
    if (err) return cb.call(self, err)
    cb.call(self, null, self._head)
  })
}

Log.prototype.get = function get (key, cb) {
  this._db.get(String(key), cb.bind(this))
}

Log.prototype.createReadStream = function createReadStream (opts) {
  if (!opts) opts = {}
  return this._db.createReadStream(opts)
}

// TODO: implement level Readable options
Log.prototype.createLiveStream = function createLiveStream (opts) {
  var self = this
  if (!opts) opts = {}
  var live = new Readable({
    objectMode: true,
    read () {
      var that = this
      debug('that._head, self._head::', that._head, self._head)
      if (that._head === self._head) return
      that._head++
      debug('gettin::', that._head)
      self.get(that._head, function (err, value) {
        if (err) return that.emit('error', err)
        debug('value::', value)
        var more = that.push({ key: String(that._head), value: value })
        debug('more::', more)
        if (more) that._read()
      })
    }
  })
  live._head = -1
  return live
}

module.exports = Log
