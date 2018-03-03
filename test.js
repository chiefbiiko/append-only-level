var tape = require('tape')
var Log = require('./index')
var levelup = require('levelup')
var memdown = require('memdown')

tape('append', function (t) {
  // opts.valueEncoding defaults to binary
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

tape.skip('opts.valueEncoding', function (t) {
  // lets autoendecode json...
  var log = Log(levelup(memdown('./fraud.db')), { valueEncoding: 'json' })
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
