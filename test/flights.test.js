import assert from 'node:assert/strict'
import test from 'node:test'
import { airportLabel, airportMarkers, airports, flightCount, routeArcs, routes } from '../src/flights.js'

test('every flight route connects two known airports', () => {
  assert.equal(Object.keys(airports).length, 46)
  assert.equal(routes.length, 65)
  assert.equal(flightCount, 81)
  const seen = new Set()
  for (const [from, to] of routes) {
    assert.ok(airports[from], from)
    assert.ok(airports[to], to)
    const key = `${from}-${to}`
    assert.equal(seen.has(key), false)
    seen.add(key)
  }
  assert.equal(routeArcs().length, routes.length)
  assert.equal(airportMarkers([0, 0, 1]).length, 46)
})

test('flight labels name each airport', () => {
  const labels = Object.keys(airports).map((code) => airportLabel(code))
  assert.equal(labels.length, 46)
  assert.ok(labels.every((label) => label.length > 0))
  assert.equal(airportLabel('CGH'), 'Congonhas')
  assert.notEqual(airportLabel('CGH'), airportLabel('GRU'))
})

test('airport coordinates stay on earth', () => {
  for (const [code, [, lat, lon]] of Object.entries(airports)) {
    assert.ok(lat >= -90 && lat <= 90, code)
    assert.ok(lon >= -180 && lon <= 180, code)
  }
})
