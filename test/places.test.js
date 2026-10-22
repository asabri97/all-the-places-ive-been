import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPlaces, counts, focusAngles, places, slug } from '../src/places.js'

const BEEN_NAMES = `Albania
Austria
Azerbaijan
Azores
Belgium
Bhutan
Brazil
Cambodia
Chile
China
Colombia
Costa Rica
Croatia
Cyprus
Czechia
Denmark
Egypt
England
France
Germany
Greece
Hungary
Ireland
Italy
Japan
Jordan
Kosovo
Latvia
Liechtenstein
Luxembourg
Madeira
Malaysia
Malta
Mauritius
Mexico
Morocco
Netherlands
Nicaragua
North Macedonia
Norway
Pakistan
Poland
Portugal
Romania
Saudi Arabia
Scotland
Seychelles
Singapore
South Korea
Spain
Sri Lanka
Sweden
Switzerland
Taiwan
Thailand
Turkey
United Arab Emirates
United Kingdom
United States of America
Vatican
Wales`.split('\n')

const WISH_NAMES = `New Zealand
Rwanda
Namibia
Mongolia
Kazakhstan
Uzbekistan
India
Papua New Guinea
Indonesia
Iceland
Kenya
Ethiopia
Lesotho
Madagascar
Tanzania
Armenia
Bahamas
Belize
Trinidad and Tobago
Guatemala
Cuba
Fiji
Antarctica`.split('\n')

test('every been-list place is on the globe once', () => {
  const visited = places.filter((place) => place.status !== 'wish').map((place) => place.name)
  assert.deepEqual(visited, BEEN_NAMES)
  assert.equal(new Set(places.map((place) => place.id)).size, places.length)
})

test('lived countries replace been for the same place', () => {
  const byName = Object.fromEntries(places.map((place) => [place.name, place.status]))
  assert.equal(byName.Germany, 'lived')
  assert.equal(byName.Pakistan, 'lived')
  assert.equal(byName['United States of America'], 'lived')
  assert.deepEqual(counts(places), { lived: 3, been: 58, wish: 23 })
})

test('wish places stay separate from places already visited', () => {
  const wished = places.filter((place) => place.status === 'wish').map((place) => place.name)
  assert.deepEqual(wished, WISH_NAMES)
  for (const name of WISH_NAMES) assert.equal(BEEN_NAMES.includes(name), false)
})

test('coordinates stay on earth and slugs are stable', () => {
  for (const place of buildPlaces()) {
    const [lat, lon] = place.location
    assert.ok(lat >= -90 && lat <= 90)
    assert.ok(lon >= -180 && lon <= 180)
    assert.equal(place.id, slug(place.name))
  }
})

test('focus angles face a known city', () => {
  const berlin = focusAngles(52.52, 13.405)
  assert.ok(berlin.phi < -1.7 && berlin.phi > -1.9)
  assert.ok(berlin.theta > 0.8 && berlin.theta < 1)
})
