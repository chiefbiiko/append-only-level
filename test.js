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

tape('log.createReadStream(opts)', function (t) {
  var log = Log(levelup(memdown('./fraud.db')))
  var values = []
  log.append('fraud', function (err, seq) {
    if (err) t.end(err)
    log.append('world', function (err, seq) {
      if (err) t.end(err)
      var rs = log.createReadStream()
      rs.on('data', function (kv) {
        values.push(kv.value.toString())
      })
      rs.on('end', function () {
        t.is(values.join(' '), 'fraud world', 'got all')
        rs.destroy()
        t.end()
      })
    })
  })
})

tape('log.createLiveStream(opts)', function (t) {
  var log = Log(levelup(memdown('./fraud.db')))
  var values = []
  log.append('fast', function (err, seq) {
    if (err) t.end(err)
    var ls = log.createLiveStream()
    var count = 0
    ls.on('data', function (kv) {
      count++
      values.push(kv.value.toString())
      if (count === 3) {
        t.is(values.join(' '), 'fast fraud money', 'got live updates')
        ls.destroy()
        t.end()
      }
    })
    log.append('fraud', function (err, seq) {
      if (err) t.end(err)
      log.append('money', function (err, seq) {
        if (err) t.end(err)
      })
    })
  })
})


tape('log.createLiveStream(opts) - lt', function (t) {
  var log = Log(levelup(memdown('./fraud.db')))
  var values = []
  log.append('fast', function (err, seq) {
    if (err) t.end(err)
    var ls = log.createLiveStream({ lt: '2' })
    ls.on('data', function (kv) {
      values.push(kv.value.toString())
    })
    // livestream has end event bc of its lt constraint
    ls.on('end', function () {
      t.is(values.join(' '), 'fast fraud', 'got live updates - lt "2"')
      ls.destroy()
      t.end()
    })
    log.append('fraud', function (err, seq) {
      if (err) t.end(err)
      log.append('money', function (err, seq) {
        if (err) t.end(err)
      })
    })
  })
})

tape('log.createLiveStream(opts) - limit', function (t) {
  var log = Log(levelup(memdown('./fraud.db')))
  var values = []
  log.append('fast', function (err, seq) {
    if (err) t.end(err)
    var ls = log.createLiveStream({ limit: 2 })
    ls.on('data', function (kv) {
      values.push(kv.value.toString())
    })
    // livestream has end event bc of its limit constraint
    ls.on('end', function () {
      t.is(values.join(' '), 'fast fraud', 'got live updates - limit 2')
      ls.destroy()
      t.end()
    })
    log.append('fraud', function (err, seq) {
      if (err) t.end(err)
      log.append('money', function (err, seq) {
        if (err) t.end(err)
      })
    })
  })
})

tape('log.createLiveStream(opts) - values only', function (t) {
  t.plan(5)
  var log = Log(levelup(memdown('./moon.db')))
  var values = []
  log.append('fast', function (err, seq) {
    if (err) t.end(err)
    var ls = log.createLiveStream({ keys: false, values: true })
    var count = 0
    ls.on('data', function (value) {
      count++
      t.false(value.constructor === Object, 'not Object')
      t.true(value.constructor === Buffer, 'Buffer')
      values.push(value.toString())
      if (count === 2) {
        t.is(values.join(' '), 'fast fraud', 'live values only')
        ls.destroy()
      }
    })
    log.append('fraud', function (err, seq) {
      if (err) t.end(err)
    })
  })
})
