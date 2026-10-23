import assert from 'node:assert/strict'
import test from 'node:test'
import { MARKER_COLOR } from '../src/places.js'
import { flightsTouching, markTogether, markerFor, mergeFlights, mergePlaces, choosePeople, buildProfile, parseShared, togetherPhotoList, comparisonIds, peopleInView, SHARED_COLOR } from '../src/profiles.js'

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
  const adaOnly = markTogether(mergePlaces([ada, leo]), trips, ['ada'])
  assert.equal(adaOnly.find((place) => place.name === 'London').together, undefined)
  const withMia = markTogether(mergePlaces([ada, leo]), trips, ['ada', 'mia'])
  assert.equal(withMia.find((place) => place.name === 'London').together, undefined)
  assert.deepEqual(comparisonIds([ada, leo], 'ada', 'leo,ada,nope'), ['leo'])
  assert.deepEqual(peopleInView([ada, leo], 'ada', ['leo']).map((person) => person.id), ['ada', 'leo'])
  const photos = new Map([['london', ['/japan1.jpg', '/japan2.jpg']]])
  assert.deepEqual(togetherPhotoList(london, photos, true), ['/japan1.jpg', '/japan2.jpg'])
  assert.deepEqual(togetherPhotoList(london, photos, false), [])
  assert.deepEqual(togetherPhotoList(paris, photos, true), [])
  assert.deepEqual(markerFor(london).color, SHARED_COLOR)
  assert.deepEqual(markerFor(london, true).color, [1, 1, 1])
  const homes = { ada: [0.2, 0.1, 0.1], leo: [0.9, 0.4, 0.1] }
  assert.deepEqual(markerFor(london, false, homes).color, homes.leo)
  const bothLived = {
    ...london,
    people: [
      { id: 'ada', status: 'lived' },
      { id: 'leo', status: 'lived' },
    ],
  }
  assert.deepEqual(markerFor(bothLived, false, homes).color, [1, 1, 1])
  const japan = {
    id: 'japan',
    location: [35, 139],
    status: 'lived',
    shared: true,
    people: [
      { id: 'saharsh', status: 'lived' },
      { id: 'hammad', status: 'been' },
    ],
  }
  assert.deepEqual(markerFor(japan).color, SHARED_COLOR)
  assert.deepEqual(markerFor(japan, false, { saharsh: [0.7, 0.2, 0.4] }).color, [0.7, 0.2, 0.4])
  const egypt = { id: 'egypt', location: [30, 31], status: 'lived', shared: false, people: [{ id: 'hammad', status: 'lived' }] }
  assert.deepEqual(markerFor(egypt).color, MARKER_COLOR.lived)
  assert.deepEqual(markerFor(egypt, false, { hammad: [0.9, 0.4, 0.1] }).color, [0.9, 0.4, 0.1])
})
