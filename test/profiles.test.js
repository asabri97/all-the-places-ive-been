import assert from 'node:assert/strict'
import test from 'node:test'
import { flightsTouching, markTogether, markerFor, mergeFlights, mergePlaces, choosePeople, buildProfile, parseShared, togetherPhotoList, SHARED_COLOR } from '../src/profiles.js'

const directory = {
  JFK: [40.64, -73.78, 'New York'],
  LHR: [51.47, -0.45, 'London'],
  CDG: [49.01, 2.55, 'Paris'],
  BER: [52.36, 13.5, 'Berlin'],
}

const ada = buildProfile({
  id: 'ada',
  directory,
  placesText: `name,status,latitude,longitude
New York,lived,40.71,-74
London,been,51.5,-0.12
Paris,been,48.86,2.35`,
  flightsText: `Date,From,To
2024-06-01,JFK,LHR
2024-06-08,LHR,CDG`,
})

const leo = buildProfile({
  id: 'leo',
  directory,
  placesText: `name,status,latitude,longitude
London,lived,51.5,-0.12
Paris,been,48.86,2.35
Berlin,been,52.52,13.4`,
  flightsText: `Date,From,To
2024-07-02,LHR,CDG
2024-11-03,BER,LHR`,
})

test('a link can select one person or both', () => {
  assert.equal(choosePeople([ada, leo], 'leo')[0].id, 'leo')
  assert.equal(choosePeople([ada, leo], 'both').length, 2)
  assert.equal(choosePeople([ada], 'both').length, 1)
})

test('shared places are the overlap', () => {
  const places = mergePlaces([ada, leo])
  const london = places.find((place) => place.name === 'London')
  const berlin = places.find((place) => place.name === 'Berlin')
  assert.equal(london.shared, true)
  assert.equal(london.status, 'lived')
  assert.deepEqual(london.people.map((person) => person.name), ['Ada', 'Leo'])
  assert.equal(berlin.shared, false)
})

test('the latest flight is the pulse point', () => {
  const flights = mergeFlights([ada, leo])
  assert.equal(flights.latest.to, 'LHR')
  assert.equal(flights.latest.date, '2024-11-03')
  const places = mergePlaces([ada])
  const london = places.find((place) => place.name === 'London')
  assert.equal(flightsTouching(london, places, mergeFlights([ada])), 2)
})

test('a polaroid marks a trip taken together', () => {
  const trips = parseShared(`place,people
London,ada leo
Berlin,ada leo mia`)
  const both = markTogether(mergePlaces([ada, leo]), trips, ['ada', 'leo'])
  const london = both.find((place) => place.name === 'London')
  const paris = both.find((place) => place.name === 'Paris')
  assert.deepEqual(london.together, ['ada', 'leo'])
  assert.equal(paris.together, undefined)
  assert.deepEqual(both.find((place) => place.name === 'Berlin').together, ['ada', 'leo', 'mia'])
  const photos = new Map([['london', ['/japan1.jpg', '/japan2.jpg']]])
  assert.deepEqual(togetherPhotoList(london, photos, true), ['/japan1.jpg', '/japan2.jpg'])
  assert.deepEqual(togetherPhotoList(london, photos, false), [])
  assert.deepEqual(togetherPhotoList(paris, photos, true), [])
  assert.deepEqual(markerFor(london).color, SHARED_COLOR)
  assert.deepEqual(markerFor(london, true).color, [1, 1, 1])
})
