import { cell, columns, parseCsv } from './csv.js'

export const MARKER_COLOR = {
  lived: [0.886, 0.239, 0.169],
  been: [0, 0.271, 0.965],
  wish: [0.071, 0.639, 0.478],
}

export const MARKER_SIZE = {
  lived: 0.05,
  been: 0.028,
  wish: 0.026,
}

const STATUS_RANK = { wish: 1, been: 2, lived: 3 }

export function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function parsePlaces(text) {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const col = columns(rows[0])
  const places = new Map()

  for (const row of rows.slice(1)) {
    const name = cell(row, col.name)
    const status = cell(row, col.status).toLowerCase()
    if (!name || !STATUS_RANK[status]) continue
    const lat = Number(cell(row, col.latitude))
    const lon = Number(cell(row, col.longitude))
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const place = {
      name,
      label: cell(row, col.label) || name,
      location: [lat, lon],
      status,
      id: slug(name),
    }
    const previous = places.get(name)
    if (!previous || STATUS_RANK[status] > STATUS_RANK[previous.status]) places.set(name, place)
  }

  return [...places.values()]
}

export function counts(places) {
  return places.reduce(
    (total, place) => {
      total[place.status] += 1
      return total
    },
    { lived: 0, been: 0, wish: 0 },
  )
}

export function focusAngles(lat, lon) {
  return {
    phi: -(lon * Math.PI) / 180 - Math.PI / 2,
    theta: (lat * Math.PI) / 180,
  }
}
