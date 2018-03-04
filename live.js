var stream = require('stream')
var util = require('util')
var debug = require('debug')('append-only-level')

function Live (source, opts) {
  if (!(this instanceof Live)) return new Live(source, opts)
  stream.Transform.call(this, opts) // autoclose false?
  this._source = source
  this._drenched = false
  debug('SOURCE', this._source)
}

util.inherits(Live, stream.Transform)

Live.prototype._transform = function transform (data, _, next) {
  debug('DATA', data.toString())
  debug('this._source.readable', this._source.readable)
  while (this._source._readableState.buffer.length) {
    this.push(this._source.read())
    next()
  }

  if (!util.isNull(data)) this.push(data)
  next()
}

module.exports = Live
