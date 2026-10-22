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

test('an airport override replaces the built-in city', () => {
  const airports = parseAirports(
    directory,
    `code,city,latitude,longitude
CGH,Congonhas,-23.6266,-46.6554
GRU,São Paulo,-23.4356,-46.4731
BKF,Aurora,39.7018,-104.752`,
  )
  const flights = parseFlights('Date,From,To\n2024-01-01,CGH,GRU\n2024-01-02,GRU,BKF', airports)
  assert.equal(airportLabel('CGH', flights.airports), 'Congonhas')
  assert.notEqual(airportLabel('CGH', flights.airports), airportLabel('GRU', flights.airports))
  assert.equal(flights.airports.BKF.city, 'Aurora')
  assert.equal(routeArcs(flights.airports, flights.routes).length, 2)
  assert.equal(airportMarkers(flights.airports, [0, 0, 1]).length, 3)
  assert.equal(flights.trips[0].date, '2024-01-01')
})

test('shared city names keep the airport code', () => {
  const parsed = parseFlights('From,To\nAAA,BBB', {
    AAA: { city: 'Springfield', lat: 1, lon: 2 },
    BBB: { city: 'Springfield', lat: 3, lon: 4 },
  })
  assert.equal(airportLabel('AAA', parsed.airports), 'Springfield AAA')
  assert.equal(airportLabel('BBB', parsed.airports), 'Springfield BBB')
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
  assert.equal(parsed.trips.length, 2)
})

test('the public sample flights draw', () => {
  const starter = parseFlights(
    readFileSync(new URL('../data/profiles/ada/flights.csv', import.meta.url), 'utf8'),
    parseAirports(directory),
  )
  assert.equal(starter.flightCount, 2)
  assert.equal(starter.routes.length, 2)
  assert.deepEqual(starter.missing, [])
})
