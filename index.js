var { Readable, Writable } = require('stream')
var debug = require('debug')('append-only-level')
// var eos = require('end-of-stream')

// TODO: get db's max key 4 _head @ init

function Log (db) {
  if (!(this instanceof Log)) return new Log(db)
  else if (!db) throw TypeError('levelup instance required')
  this._db = db
  this._head = -1

  // this._choking = true
  // this._waiting = []
  // var self = this
  // var keystream = this._db.createKeyStream({ reverse: true, limit: 1 })
  // keystream.once('data', function oncedata (rec) {
  //   debug('rec.key?::', rec)
  //   self._head = rec.key
  // })
  // keystream.on('end', function onend () {
  //   debug('::onend::')
  //   debug('waiting::', self._waiting, self._waiting.length)
  //   var fifo = self._waiting.reverse()
  //   for (var i = 0; i < fifo.length; i++) fifo[i]()
  //   // while (self._waiting.length) self._waiting.shift()()
  //   self._choking = false
  // })

}

function count () {
  return this._head + 1
}

Log.prototype.__defineGetter__('size', count)
Log.prototype.__defineGetter__('length', count)

Log.prototype.append = function append (value, cb) {

  // if (this._choking) {
  //   return this._waiting.push(this.append.bind(this, value, cb))
  // }

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

Log.prototype.createLiveStream = function createLiveStream (opts) {
  var self = this
  opts = Object.assign({ limit: -1, keys: true, values: true }, opts || {})
  opts.lt = Number(opts.lt) || -1
  opts.lte = Number(opts.lte) || -99
  var liveStream = new Readable({
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
  if (opts.gt) liveStream._head = Number(opts.gt)
  else if (opts.gte) liveStream._head = Number(opts.gte) - 1
  else liveStream._head = -1
  debug('liveStream._head, opts::', liveStream._head, opts)
  return liveStream
}

Log.prototype.createAppendStream = function createAppendStream (opts) {
  opts = Object.assign({ limit: -1 }, opts || {})
  var self = this
  var appendStream = new Writable({
    objectMode: true,
    write (chunk, _, next) {
      ++this._writes
      if (opts.limit !== -1 && this._writes > opts.limit) return
      self.append(chunk, function (err, seq) {
        if (err) return next(err)
        next(null)
      })
    }
  })
  appendStream._writes = 0
  return appendStream
}

module.exports = Log
