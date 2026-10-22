const LIVED = new Set([
  'Germany',
  'Pakistan',
  'United States of America',
])

const BEEN = [
  ['Albania', 41.3275, 19.8187],
  ['Austria', 48.2082, 16.3738],
  ['Azerbaijan', 40.4093, 49.8671],
  ['Azores', 37.7412, -25.6756],
  ['Belgium', 50.8503, 4.3517],
  ['Bhutan', 27.4728, 89.639],
  ['Brazil', -15.7975, -47.8919],
  ['Cambodia', 11.5564, 104.9282],
  ['Chile', -33.4489, -70.6693],
  ['China', 39.9042, 116.4074],
  ['Colombia', 4.711, -74.0721],
  ['Costa Rica', 9.9281, -84.0907],
  ['Croatia', 45.815, 15.9819],
  ['Cyprus', 35.1856, 33.3823],
  ['Czechia', 50.0755, 14.4378],
  ['Denmark', 55.6761, 12.5683],
  ['Egypt', 30.0444, 31.2357],
  ['England', 51.5074, -0.1278],
  ['France', 48.8566, 2.3522],
  ['Germany', 52.52, 13.405],
  ['Greece', 37.9838, 23.7275],
  ['Hungary', 47.4979, 19.0402],
  ['Ireland', 53.3498, -6.2603],
  ['Italy', 41.9028, 12.4964],
  ['Japan', 35.6762, 139.6503],
  ['Jordan', 31.9539, 35.9106],
  ['Kosovo', 42.6629, 21.1655],
  ['Latvia', 56.9496, 24.1052],
  ['Liechtenstein', 47.141, 9.5209],
  ['Luxembourg', 49.6116, 6.1319],
  ['Madeira', 32.6669, -16.9241],
  ['Malaysia', 3.139, 101.6869],
  ['Malta', 35.8989, 14.5146],
  ['Mauritius', -20.1609, 57.5012],
  ['Mexico', 19.4326, -99.1332],
  ['Morocco', 34.0209, -6.8416],
  ['Netherlands', 52.3676, 4.9041],
  ['Nicaragua', 12.114, -86.2362],
  ['North Macedonia', 41.9981, 21.4254],
  ['Norway', 59.9139, 10.7522],
  ['Pakistan', 33.6844, 73.0479],
  ['Poland', 52.2297, 21.0122],
  ['Portugal', 38.7223, -9.1393],
  ['Romania', 44.4268, 26.1025],
  ['Saudi Arabia', 24.7136, 46.6753],
  ['Scotland', 55.9533, -3.1883],
  ['Seychelles', -4.6191, 55.4513],
  ['Singapore', 1.3521, 103.8198],
  ['South Korea', 37.5665, 126.978],
  ['Spain', 40.4168, -3.7038],
  ['Sri Lanka', 6.9271, 79.8612],
  ['Sweden', 59.3293, 18.0686],
  ['Switzerland', 46.948, 7.4474],
  ['Taiwan', 25.033, 121.5654],
  ['Thailand', 13.7563, 100.5018],
  ['Turkey', 39.9334, 32.8597],
  ['United Arab Emirates', 24.4539, 54.3773],
  ['United Kingdom', 51.5072, -0.1276],
  ['United States of America', 38.9072, -77.0369],
  ['Vatican', 41.9029, 12.4534],
  ['Wales', 51.4816, -3.1791],
]

export const WISH = [
  ['New Zealand', -41.2866, 174.7756],
  ['Rwanda', -1.9441, 30.0619],
  ['Namibia', -22.5594, 17.0832],
  ['Mongolia', 47.8864, 106.9057],
  ['Kazakhstan', 51.1605, 71.4704],
  ['Uzbekistan', 41.2995, 69.2401],
  ['India', 28.6139, 77.209],
  ['Papua New Guinea', -9.4438, 147.1803],
  ['Indonesia', -6.2088, 106.8456],
  ['Iceland', 64.1466, -21.9426],
  ['Kenya', -1.2921, 36.8219],
  ['Ethiopia', 9.0054, 38.7636],
  ['Lesotho', -29.3151, 27.4869],
  ['Madagascar', -18.8792, 47.5079],
  ['Tanzania', -6.163, 35.7516],
  ['Armenia', 40.1872, 44.5152],
  ['Bahamas', 25.0479, -77.3554],
  ['Belize', 17.2514, -88.7669],
  ['Trinidad and Tobago', 10.6549, -61.5019],
  ['Guatemala', 14.6349, -90.5069],
  ['Cuba', 23.1136, -82.3666],
  ['Fiji', -18.1248, 178.4501],
  ['Antarctica', -75.25, 0],
]

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

export function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function buildPlaces() {
  const visited = BEEN.map(([name, lat, lon]) => ({
    name,
    location: [lat, lon],
    status: LIVED.has(name) ? 'lived' : 'been',
    id: slug(name),
  }))

  const wished = WISH.map(([name, lat, lon]) => ({
    name,
    location: [lat, lon],
    status: 'wish',
    id: slug(name),
  }))

  return [...visited, ...wished]
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

export const places = buildPlaces()
