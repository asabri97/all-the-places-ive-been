import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  airportLabel,
  airportMarkers,
  parseAirports,
  parseFlights,
  routeArcs,
} from '../src/flights.js'

const directory = JSON.parse(readFileSync(new URL('../src/airports.json', import.meta.url), 'utf8'))
const overrides = readFileSync(new URL('../example/airports.csv', import.meta.url), 'utf8')
const airports = parseAirports(directory, overrides)
const flights = parseFlights(readFileSync(new URL('../example/flights.csv', import.meta.url), 'utf8'), airports)

test('every flight route connects two known airports', () => {
  assert.equal(Object.keys(flights.airports).length, 46)
  assert.equal(flights.routes.length, 65)
  assert.equal(flights.flightCount, 81)
  assert.deepEqual(flights.missing, [])
  const seen = new Set()
  for (const [from, to] of flights.routes) {
    assert.ok(flights.airports[from], from)
    assert.ok(flights.airports[to], to)
    const key = `${from}-${to}`
    assert.equal(seen.has(key), false)
    seen.add(key)
  }
  assert.equal(routeArcs(flights.airports, flights.routes).length, flights.routes.length)
  assert.equal(airportMarkers(flights.airports, [0, 0, 1]).length, 46)
})

test('flight labels name each airport', () => {
  const labels = Object.keys(flights.airports).map((code) => airportLabel(code, flights.airports))
  assert.equal(labels.length, 46)
  assert.ok(labels.every((label) => label.length > 0))
  assert.equal(airportLabel('CGH', flights.airports), 'Congonhas')
  assert.notEqual(airportLabel('CGH', flights.airports), airportLabel('GRU', flights.airports))
  assert.equal(flights.airports.BKF.city, 'Aurora')
})

test('shared city names keep the airport code', () => {
  const parsed = parseFlights('From,To\nAAA,BBB', {
    AAA: { city: 'Springfield', lat: 1, lon: 2 },
    BBB: { city: 'Springfield', lat: 3, lon: 4 },
  })
  assert.equal(airportLabel('AAA', parsed.airports), 'Springfield AAA')
  assert.equal(airportLabel('BBB', parsed.airports), 'Springfield BBB')
})

test('airport coordinates stay on earth', () => {
  for (const [code, airport] of Object.entries(flights.airports)) {
    assert.ok(airport.lat >= -90 && airport.lat <= 90, code)
    assert.ok(airport.lon >= -180 && airport.lon <= 180, code)
  }
})

test('a flight export ignores extra columns and canceled rows', () => {
  const parsed = parseFlights(
    `Date,From,To,Canceled,Notes
2024-01-01,JFK,LHR,false,"hello, there"
2024-01-02,LHR,JFK,true,skipped
2024-01-03,JFK,LHR,false,again
2024-01-04,JFK,ZZZ,false,unknown`,
    parseAirports(directory),
  )
  assert.equal(parsed.flightCount, 3)
  assert.deepEqual(parsed.routes, [['JFK', 'LHR']])
  assert.deepEqual(parsed.missing, ['ZZZ'])
})

test('the starter flights draw without a custom airport file', () => {
  const starter = parseFlights(
    readFileSync(new URL('../data/flights.csv', import.meta.url), 'utf8'),
    parseAirports(directory, readFileSync(new URL('../data/airports.csv', import.meta.url), 'utf8')),
  )
  assert.equal(starter.flightCount, 3)
  assert.equal(starter.routes.length, 3)
  assert.deepEqual(starter.missing, [])
})
