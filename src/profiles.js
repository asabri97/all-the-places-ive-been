import { cell, columns, parseCsv } from './csv.js'
import { parseFlights, parseAirports } from './flights.js'
import { MARKER_COLOR, MARKER_SIZE, parsePlaces, slug } from './places.js'

export const SHARED_COLOR = [0.48, 0.32, 0.86]

const STATUS_RANK = { wish: 1, been: 2, lived: 3 }

export function profileName(id) {
  return id
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function buildProfile({ id, placesText = '', flightsText = '', airportsText = '', directory = {} }) {
  return {
    id,
    name: profileName(id),
    places: parsePlaces(placesText).map((place) => ({ ...place, personId: id })),
    flights: parseFlights(flightsText, parseAirports(directory, airportsText)),
  }
}

export function choosePeople(profiles, personParam) {
  if (!profiles.length) return []
  if (personParam === 'both' && profiles.length > 1) return profiles
  return [profiles.find((profile) => profile.id === personParam) || profiles[0]]
}

export function activePerson(profiles, personParam) {
  if (personParam === 'both') return choosePeople(profiles, '')[0]?.id || ''
  return choosePeople(profiles, personParam)[0]?.id || ''
}

export function comparisonIds(profiles, mainId, withParam) {
  const known = new Set(profiles.map((profile) => profile.id))
  return [...new Set(String(withParam || '').split(','))]
    .map((id) => id.trim().toLowerCase())
    .filter((id) => known.has(id) && id !== mainId)
}

export function peopleInView(profiles, mainId, withIds) {
  const main = choosePeople(profiles, mainId)[0]
  if (!main) return []
  const extras = withIds.map((id) => profiles.find((profile) => profile.id === id)).filter(Boolean)
  return [main, ...extras]
}

export function mergePlaces(people) {
  const byId = new Map()
  for (const person of people) {
    for (const place of person.places) {
      const current = byId.get(place.id)
      if (!current) {
        byId.set(place.id, {
          ...place,
          people: [{ id: person.id, name: person.name, status: place.status }],
        })
        continue
      }
      current.people.push({ id: person.id, name: person.name, status: place.status })
      if (STATUS_RANK[place.status] > STATUS_RANK[current.status]) {
        current.status = place.status
        current.name = place.name
        current.label = place.label
        current.location = place.location
      }
    }
  }
  return [...byId.values()].map((place) => ({ ...place, shared: place.people.length > 1 }))
}

export function parseShared(text) {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const col = columns(rows[0])
  const trips = []
  for (const row of rows.slice(1)) {
    const name = cell(row, col.place)
    const people = cell(row, col.people)
      .toLowerCase()
      .split(/[^a-z0-9_-]+/)
      .filter(Boolean)
    if (!name || people.length < 2) continue
    trips.push({ id: slug(name), people: [...new Set(people)] })
  }
  return trips
}

export function markTogether(places, trips, selectedIds) {
  const selected = new Set(selectedIds)
  const visible = new Map()
  for (const trip of trips) {
    const present = trip.people.filter((id) => selected.has(id))
    if (present.length >= 2) visible.set(trip.id, trip.people)
  }
  return places.map((place) => (visible.has(place.id) ? { ...place, together: visible.get(place.id) } : place))
}

export function togetherPhotoList(place, photos, showTogether) {
  if (!showTogether) return []
  return photos.get(place.id) || []
}

export function livedBy(place) {
  return (place.people || []).filter((person) => person.status === 'lived')
}

export function markerFor(place, together = false, livedColors = null) {
  const livers = livedColors ? livedBy(place) : []
  const oneHome = livers.length === 1
  const sharedHome = livers.length > 1
  return {
    id: place.id,
    location: place.location,
    size: together || sharedHome ? 0.02 : oneHome ? MARKER_SIZE.lived : place.shared ? 0.04 : MARKER_SIZE[place.status],
    color:
      together || sharedHome
        ? [1, 1, 1]
        : oneHome
          ? livedColors[livers[0].id] || MARKER_COLOR.lived
          : place.shared
            ? SHARED_COLOR
            : MARKER_COLOR[place.status],
  }
}

export function mergeFlights(people) {
  const seen = new Set()
  const routes = []
  const trips = []
  const airports = {}
  const missing = new Set()
  let flightCount = 0
  for (const person of people) {
    flightCount += person.flights.flightCount
    Object.assign(airports, person.flights.airports)
    for (const code of person.flights.missing) missing.add(code)
    for (const trip of person.flights.trips) trips.push({ ...trip, personId: person.id })
    for (const [from, to] of person.flights.routes) {
      const key = `${from}>${to}`
      if (seen.has(key)) continue
      seen.add(key)
      routes.push([from, to])
    }
  }
  trips.sort((a, b) => String(a.date).localeCompare(String(b.date)))
  return {
    flightCount,
    routes,
    trips,
    airports,
    missing: [...missing],
    latest: trips.at(-1) || null,
  }
}

function distanceKm(lat, lon, otherLat, otherLon) {
  const toRad = (degrees) => (degrees * Math.PI) / 180
  const latDelta = toRad(otherLat - lat)
  const lonDelta = toRad(otherLon - lon)
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(otherLat)) * Math.sin(lonDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function flightsTouching(place, places, flights) {
  const owner = new Map()
  for (const [code, airport] of Object.entries(flights.airports)) {
    let nearest = ''
    let nearestKm = Infinity
    for (const candidate of places) {
      const km = distanceKm(airport.lat, airport.lon, candidate.location[0], candidate.location[1])
      if (km < nearestKm) {
        nearest = candidate.id
        nearestKm = km
      }
    }
    owner.set(code, nearest)
  }
  return flights.trips.filter((trip) => owner.get(trip.from) === place.id || owner.get(trip.to) === place.id).length
}
