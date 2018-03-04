var tape = require('tape')
var Log = require('./index')
var levelup = require('levelup')
var memdown = require('memdown')
var enc = require('encoding-down')

tape('append', function (t) {
  var log = Log(levelup(memdown('./fraud.db')))
  log.append('fraud', function (err, seq) {
    if (err) t.end(err)
    log.get(seq, function (err, value) {
      if (err) t.end(err)
      t.is(value.toString(), 'fraud', 'same')
      t.end()
    })
  })
})

tape('object mode', function (t) {
  var log = Log(levelup(enc(memdown('./fraud.db'), { valueEncoding: 'json' })))
  var record = { name: 'chiefbiiko', biz: 'fraud' }
  log.append(record, function (err, seq) {
    if (err) t.end(err)
    log.get(seq, function (err, value) {
      if (err) t.end(err)
      t.same(value, record, 'got back pojo')
      t.end()
    })
  })
})

tape('autoboxing', function (t) {
  var log = Log(levelup(memdown('./fraud.db')))
  log.append('fraud', function (err, seq) {
    if (err) t.end(err)
    t.true(this === log, 'this === log in append cb')
    log.get(seq, function (err, value) {
      if (err) t.end(err)
      t.true(this === log, 'this === log in get cb')
      t.end()
    })
  })
})

tape('size aka length', function (t) {
  var log = Log(levelup(memdown('./fraud.db')))
  t.is(log.length, 0, 'length 0')
  t.is(log.size, 0, 'size 0')
  log.append('fraud', function (err, seq) {
    if (err) t.end(err)
    t.is(log.length, 1, 'length 1')
    t.is(log.size, 1, 'size 1')
    log.append('juju', function (err, value) {
      if (err) t.end(err)
      t.is(log.length, 2, 'length 2')
      t.is(log.size, 2, 'size 2')
      t.end()
    })
  })
})

tape.only('live', function (t) {
  var log = Log(levelup(memdown('./fraud.db')))
  var chunks = []
  log.append('fraud', function (err, seq) {
    if (err) t.end(err)
    var ls = log.createLiveStream()
    ls.on('data', function (chunk) {
      chunks.push(chunk)
    })
    log.append('world', function (err, seq) {
      if (err) t.end(err)
      t.is(chunks.join(' '), 'fraud world', 'got the live update')
      ls.destroy()
      t.end()
    })
  })
})
