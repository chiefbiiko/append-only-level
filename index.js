// TODO: live stream, pass thru error events, level-errors

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

module.exports = Log
