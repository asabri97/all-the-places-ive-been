import { cell, columns, parseCsv } from './csv.js'

export const flightColor = [0.3, 0.5, 1]

function knownAirport(airports, code) {
  const airport = airports[code]
  return airport && Number.isFinite(airport.lat) && Number.isFinite(airport.lon)
}

export function parseAirports(directory, overridesText = '') {
  const airports = {}
  for (const [code, [lat, lon, city]] of Object.entries(directory)) {
    airports[code] = { city, lat, lon }
  }

  const rows = parseCsv(overridesText)
  if (rows.length < 2) return airports
  const col = columns(rows[0])
  for (const row of rows.slice(1)) {
    const code = cell(row, col.code).toUpperCase()
    if (!/^[A-Z0-9]{3,4}$/.test(code)) continue
    const current = airports[code]
    const lat = Number(cell(row, col.latitude))
    const lon = Number(cell(row, col.longitude))
    airports[code] = {
      city: cell(row, col.city) || current?.city || code,
      lat: Number.isFinite(lat) ? lat : current?.lat,
      lon: Number.isFinite(lon) ? lon : current?.lon,
    }
  }
  return airports
}

export function parseFlights(text, airports) {
  const rows = parseCsv(text)
  const col = columns(rows[0] ?? [])
  const routes = []
  const trips = []
  const seen = new Set()
  const used = []
  const missing = new Set()
  let flightCount = 0

  for (const row of rows.slice(1)) {
    const from = cell(row, col.from).toUpperCase()
    const to = cell(row, col.to).toUpperCase()
    if (!from || !to) continue
    const canceled = cell(row, col.canceled).toLowerCase()
    if (canceled === 'true' || canceled === 'yes' || canceled === '1') continue
    flightCount += 1
    const fromKnown = knownAirport(airports, from)
    const toKnown = knownAirport(airports, to)
    if (!fromKnown) missing.add(from)
    if (!toKnown) missing.add(to)
    if (!fromKnown || !toKnown) continue
    trips.push({ date: cell(row, col.date), from, to })
    if (!used.includes(from)) used.push(from)
    if (!used.includes(to)) used.push(to)
    const key = `${from}>${to}`
    if (seen.has(key)) continue
    seen.add(key)
    routes.push([from, to])
  }

  return {
    flightCount,
    routes,
    trips,
    airports: Object.fromEntries(used.map((code) => [code, airports[code]])),
    missing: [...missing],
  }
}

export function airportLabel(code, airports) {
  const city = airports[code].city
  const shared = Object.values(airports).filter((airport) => airport.city === city).length > 1
  return shared ? `${city} ${code}` : city
}

export function airportMarkers(airports, color) {
  return Object.entries(airports).map(([code, airport]) => ({
    id: `apt-${code.toLowerCase()}`,
    location: [airport.lat, airport.lon],
    size: 0.02,
    color,
  }))
}

export function routeArcs(airports, routes, color) {
  return routes.map(([from, to]) => ({
    from: [airports[from].lat, airports[from].lon],
    to: [airports[to].lat, airports[to].lon],
    ...(color ? { color } : {}),
  }))
}
