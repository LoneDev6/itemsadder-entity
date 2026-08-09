import assert from 'assert'
;(globalThis as any).Settings = { stored: { language: { value: 'fr' } } }
const { intl, tl } = require('./intl')

assert.strictEqual(tl('test.hello'), 'test.hello')
intl.register('fr', { test: { hello: 'Bonjour' } })
assert.strictEqual(tl('test.hello'), 'Bonjour')
