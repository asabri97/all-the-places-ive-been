import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { counts, focusAngles, groupPlacePhotos, parsePlaces, slug } from '../src/places.js'

test('a later lived row wins over been', () => {
  const parsed = parsePlaces(`name,status,latitude,longitude,label
Germany,been,1,2,
Germany,lived,52.52,13.405,
United States of America,lived,38.9,-77,United States
Iceland,wish,64.1,-21.9,
Iceland,been,64.1,-21.9,`)
  assert.equal(parsed.find((place) => place.name === 'Germany').status, 'lived')
  assert.equal(parsed.find((place) => place.name === 'Germany').location[0], 52.52)
  assert.equal(parsed.find((place) => place.name === 'Iceland').status, 'been')
  assert.equal(parsed.find((place) => place.name === 'United States of America').label, 'United States')
  assert.equal(parsed.find((place) => place.name === 'Germany').id, slug('Germany'))
})

test('coordinates stay on earth', () => {
  const parsed = parsePlaces(`name,status,latitude,longitude
Berlin,been,52.52,13.405
Broken,been,not,a-number`)
  assert.equal(parsed.length, 1)
  const [lat, lon] = parsed[0].location
  assert.ok(lat >= -90 && lat <= 90)
  assert.ok(lon >= -180 && lon <= 180)
})

test('numbered photos stack on one place', () => {
  assert.deepEqual(
    groupPlacePhotos(['japan2.jpg', 'japan1.HEIC', 'Japan1.jpg', 'chile1.JPG', 'amsterdam.jpg', 'egypt.jpg', 'notes.txt']),
    {
      japan: ['Japan1.jpg', 'japan2.jpg'],
      chile: ['chile1.JPG'],
      netherlands: ['amsterdam.jpg'],
      egypt: ['egypt.jpg'],
    },
  )
})

test('focus angles face a known city', () => {
  const berlin = focusAngles(52.52, 13.405)
  assert.ok(berlin.phi < -1.7 && berlin.phi > -1.9)
  assert.ok(berlin.theta > 0.8 && berlin.theta < 1)
})

test('the public sample lists are valid', () => {
  for (const name of ['ada', 'leo']) {
    const places = parsePlaces(readFileSync(new URL(`../data/profiles/${name}/places.csv`, import.meta.url), 'utf8'))
    const totals = counts(places)
    assert.ok(totals.lived + totals.been + totals.wish === places.length)
    assert.ok(places.length > 0)
  }
})
