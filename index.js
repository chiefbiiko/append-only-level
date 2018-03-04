// TODO: live stream, pass thru error events

var Live = require('./live')
var streamSet = require('stream-set')
var debug = require('debug')('append-only-level')
var multipipe = require('multipipe')
var stream = require('stream')
var pump = require('pump')

function Log (db) {
  if (!(this instanceof Log)) return new Log(db)
  else if (!db) throw Error('levelup instance required')
  this._db = db
  this._head = -1
  this._livestreams = streamSet()
}

function count () {
  return this._head + 1
}

Log.prototype.__defineGetter__('size', count)
Log.prototype.__defineGetter__('length', count)

Log.prototype.append = function append (value, cb) {
  var self = this
  this._livestreams.forEach(function (livestream) {
    debug('live updating', value)
    livestream.write(value)
  })
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

Log.prototype.createLiveStream = function createLiveStream (opts) {
  if (!opts) opts = {}
  var passthru = new stream.PassThrough()
  var rs = this.createReadStream(opts)
  this._livestreams.add(passthru)
  return pump(rs, passthru)
  // return multipipe(rs, passthru)
  // var ls = Live(this.createReadStream(opts), opts)
  // this._livestreams.add(ls)
  // return ls
}

module.exports = Log
