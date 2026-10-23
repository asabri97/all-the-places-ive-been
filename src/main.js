import createGlobe from 'cobe'
import profileFiles from 'virtual:profiles'
import directory from './airports.json'
import { airportLabel, airportMarkers, flightColor, routeArcs } from './flights.js'
import { counts, focusAngles } from './places.js'
import { activePerson, buildProfile, comparisonIds, flightsTouching, livedBy, markTogether, markerFor, mergeFlights, mergePlaces, parseShared, peopleInView, togetherPhotoList } from './profiles.js'
import './style.css'

const profiles = Object.entries(profileFiles.profiles)
  .map(([id, files]) =>
    buildProfile({
      id,
      placesText: files['places.csv'] || '',
      flightsText: files['flights.csv'] || '',
      airportsText: files['airports.csv'] || '',
      directory,
    }),
  )
  .sort((a, b) => a.name.localeCompare(b.name))
const sharedTrips = parseShared(profileFiles.sharedText)
const assetPhotos = new Map(Object.entries(profileFiles.assetPhotos || {}))

const params = new URLSearchParams(location.search)
let personParam = activePerson(profiles, params.get('person') || '')
let withIds = comparisonIds(profiles, personParam, params.get('with'))
let mode = 'places'

const state = {
  phi: focusAngles(28, 12).phi,
  theta: 0.2,
  dragging: false,
  focus: null,
}

const app = document.querySelector('#app')
const personButtons = profiles
  .map(
    (profile) =>
      `<button class="switch-btn person-btn" type="button" data-person="${profile.id}">${profile.name}</button>`,
  )
  .join('')
app.innerHTML = `
  <main class="page">
    <section class="stage" aria-label="Globe">
      <canvas></canvas>
    </section>
    <aside class="names" aria-label="People"></aside>
    <div class="switch">
      <div class="switch-group" role="tablist" aria-label="Globe view">
        <button class="switch-btn mode-btn" type="button" data-mode="places" aria-pressed="true">Places</button>
        <button class="switch-btn mode-btn" type="button" data-mode="flights" aria-pressed="false">Flights</button>
      </div>
      <div class="switch-group" role="tablist" aria-label="Person">${personButtons}</div>
    </div>
    <article class="card" hidden>
      <button class="card-close" type="button">Close</button>
      <p class="card-status"></p>
      <h2 class="card-title"></h2>
      <p class="card-detail"></p>
    </article>
    <p class="caption"></p>
    <ul class="legend">
      <li class="lived-key"><span class="dot lived"></span>Lived</li>
      <li><span class="dot been"></span>Been</li>
      <li><span class="dot wish"></span>Wish</li>
      <li class="shared-key" hidden><span class="dot shared"></span>Shared</li>
      <li class="together-key" hidden><span class="dot together"></span>Together</li>
    </ul>
  </main>
`

const canvas = app.querySelector('canvas')
const stage = app.querySelector('.stage')
const namesEl = app.querySelector('.names')
const caption = app.querySelector('.caption')
const legend = app.querySelector('.legend')
const card = app.querySelector('.card')
const frameEl = () => canvas.parentElement

function selectedPeople() {
  return peopleInView(profiles, personParam, withIds)
}

function writeUrl() {
  const url = new URL(location.href)
  url.searchParams.set('person', personParam)
  if (withIds.length) url.searchParams.set('with', withIds.join(','))
  else url.searchParams.delete('with')
  history.replaceState(null, '', url)
}

function renderNames() {
  const main = profiles.find((profile) => profile.id === personParam)
  const others = profiles.filter((profile) => profile.id !== personParam)
  if (!main) {
    namesEl.innerHTML = ''
    return
  }
  const companion = (profile) => {
    const on = withIds.includes(profile.id)
    return `<button class="name name-with" type="button" data-with="${profile.id}" aria-pressed="${on}">${profile.name}</button>`
  }
  namesEl.innerHTML = `<p class="name name-main">${main.name}</p>${others.map(companion).join('')}`
}

function viewPlaces() {
  const people = selectedPeople()
  return markTogether(
    mergePlaces(people),
    sharedTrips,
    people.map((person) => person.id),
  )
}

function viewFlights() {
  return mergeFlights(selectedPeople())
}

function wentTogether(place) {
  if (!place.together || withIds.length === 0) return false
  const people = new Set(place.together)
  return people.has(personParam) && withIds.some((id) => people.has(id))
}

const LIVED_COLORS = [
  { hex: '#e23d2b', rgb: [0.886, 0.239, 0.169] },
  { hex: '#e07a1f', rgb: [0.878, 0.478, 0.122] },
  { hex: '#c23b6e', rgb: [0.761, 0.231, 0.431] },
  { hex: '#5b4ddb', rgb: [0.357, 0.302, 0.859] },
]

function livedColorMap() {
  return Object.fromEntries(profiles.map((person, index) => [person.id, LIVED_COLORS[index % LIVED_COLORS.length]]))
}

function markersFor(places) {
  const colors = withIds.length ? Object.fromEntries(Object.entries(livedColorMap()).map(([id, color]) => [id, color.rgb])) : null
  return places.map((place) => markerFor(place, wentTogether(place), colors))
}

function setPressed(selector, attr, value) {
  for (const button of app.querySelectorAll(selector)) {
    button.setAttribute('aria-pressed', String(button.dataset[attr] === value))
  }
}

function captionFor(places, flights, flightsMode) {
  if (flightsMode) {
    const missing = flights.missing.length ? ` · missing ${flights.missing.join(', ')}` : ''
    return `${flights.flightCount} flights · ${flights.routes.length} routes${missing}`
  }
  const totals = counts(places)
  const shared = places.filter((place) => place.shared && !wentTogether(place)).length
  const together = places.filter(wentTogether).length
  const extra = [shared ? `${shared} shared` : '', together ? `${together} together` : ''].filter(Boolean).join(' · ')
  return `${totals.lived} lived · ${totals.been} been · ${totals.wish} wish${extra ? ` · ${extra}` : ''}`
}

function clearAnchors() {
  frameEl()
    ?.querySelectorAll('.flight-label, .marker-label, .marker-hit, .pulse, .polaroid, .together-dot, .lived-split')
    .forEach((node) => node.remove())
}

function anchorStyle(node, id) {
  node.style.positionAnchor = `--cobe-${id}`
  node.style.opacity = `var(--cobe-visible-${id}, 0)`
}

function placePhotos(place) {
  return togetherPhotoList(place, assetPhotos, wentTogether(place))
}

function appendPolaroids(parent, place, photos) {
  photos.forEach((src, index) => {
    const offset = index - (photos.length - 1) / 2
    const frame = document.createElement('div')
    frame.className = 'polaroid'
    anchorStyle(frame, place.id)
    frame.style.filter = `blur(calc((1 - var(--cobe-visible-${place.id}, 0)) * 8px))`
    frame.style.setProperty('--polaroid-rotate', `${offset * 7}deg`)
    frame.style.setProperty('--polaroid-shift', `${offset * 18}px`)
    frame.style.zIndex = String(2 + index)
    const img = document.createElement('img')
    img.alt = place.label || place.name
    img.src = src
    const caption = document.createElement('span')
    caption.className = 'polaroid-caption'
    caption.textContent = place.label || place.name
    frame.append(img, caption)
    parent.append(frame)
  })
}

function renderAnchors(places, flights, flightsMode) {
  const parent = frameEl()
  if (!parent) return
  clearAnchors()
  if (flightsMode) {
    for (const code of Object.keys(flights.airports)) {
      const label = document.createElement('div')
      label.className = 'flight-label'
      label.textContent = airportLabel(code, flights.airports)
      anchorStyle(label, `apt-${code.toLowerCase()}`)
      parent.append(label)
    }
    if (flights.latest) {
      const pulse = document.createElement('div')
      pulse.className = 'pulse'
      anchorStyle(pulse, `apt-${flights.latest.to.toLowerCase()}`)
      parent.append(pulse)
    }
    return
  }
  for (const place of places) {
    const hit = document.createElement('button')
    hit.type = 'button'
    hit.className = 'marker-hit'
    hit.dataset.place = place.id
    hit.setAttribute('aria-label', place.label || place.name)
    anchorStyle(hit, place.id)
    parent.append(hit)
    const photos = placePhotos(place)
    const together = wentTogether(place)
    const livers = livedBy(place)
    const colors = withIds.length ? livedColorMap() : null
    if (together) {
      const ring = document.createElement('div')
      ring.className = 'together-dot'
      anchorStyle(ring, place.id)
      parent.append(ring)
    }
    if (colors && livers.length > 1 && !together) {
      const split = document.createElement('div')
      split.className = 'lived-split'
      const stops = livers
        .map((person, index) => {
          const start = (index / livers.length) * 360
          const end = ((index + 1) / livers.length) * 360
          return `${colors[person.id].hex} ${start}deg ${end}deg`
        })
        .join(', ')
      split.style.background = `conic-gradient(${stops})`
      anchorStyle(split, place.id)
      parent.append(split)
    }
    if ((place.status === 'lived' || place.shared || livers.length) && !together) {
      const label = document.createElement('div')
      label.className = place.shared && !livers.length ? 'marker-label is-shared' : 'marker-label'
      if (colors && livers.length === 1) label.style.background = colors[livers[0].id].hex
      if (colors && livers.length > 1) label.classList.add('is-shared-home')
      const names = livers.map((person) => person.name).join(' · ')
      label.textContent = colors && names ? `${place.label || place.name} · ${names}` : place.label || place.name
      anchorStyle(label, place.id)
      parent.append(label)
    }
    if (photos.length) appendPolaroids(parent, place, photos)
    else if (together) {
      const frame = document.createElement('div')
      frame.className = 'polaroid is-blank'
      anchorStyle(frame, place.id)
      frame.style.filter = `blur(calc((1 - var(--cobe-visible-${place.id}, 0)) * 8px))`
      const caption = document.createElement('span')
      caption.className = 'polaroid-caption'
      caption.textContent = place.label || place.name
      frame.append(caption)
      parent.append(frame)
    }
  }
}

function showCard(place, flights) {
  const went = wentTogether(place)
  const livers = livedBy(place)
  const status = went ? 'Together' : livers.length ? 'Lived' : place.shared ? 'Shared' : place.status
  card.querySelector('.card-status').textContent = status
  card.querySelector('.card-title').textContent = place.label || place.name
  const listed = went
    ? place.people.filter((person) => !place.together || place.together.includes(person.id))
    : place.shared || livers.length
      ? place.people
      : []
  const who = listed.map((person) => `${person.name} ${person.status}`).join(' · ')
  const touched = flightsTouching(place, viewPlaces(), flights)
  const flightText = touched ? `${touched} flight${touched === 1 ? '' : 's'}` : ''
  card.querySelector('.card-detail').textContent = [who, flightText].filter(Boolean).join(' · ')
  card.hidden = false
  const [lat, lon] = place.location
  state.focus = focusAngles(lat, lon)
}

function renderLivedLegend(places) {
  legend.querySelectorAll('.lived-person, .lived-many-key').forEach((node) => node.remove())
  const base = legend.querySelector('.lived-key')
  if (!withIds.length) {
    base.hidden = false
    return
  }
  const colors = livedColorMap()
  const names = new Map()
  const sharedHome = new Map()
  for (const place of places) {
    if (wentTogether(place)) continue
    const livers = livedBy(place)
    for (const person of livers) names.set(person.id, person.name)
    if (livers.length > 1) for (const person of livers) sharedHome.set(person.id, colors[person.id].hex)
  }
  base.hidden = names.size > 0
  const items = [...names].map(([id, name]) => {
    const item = document.createElement('li')
    item.className = 'lived-person'
    item.innerHTML = `<span class="dot lived" style="background:${colors[id].hex}"></span>${name}`
    return item
  })
  if (sharedHome.size > 1) {
    const item = document.createElement('li')
    item.className = 'lived-many-key'
    const stops = [...sharedHome.values()]
      .map((hex, index, list) => {
        const start = (index / list.length) * 360
        const end = ((index + 1) / list.length) * 360
        return `${hex} ${start}deg ${end}deg`
      })
      .join(', ')
    item.innerHTML = `<span class="dot lived-many" style="background:conic-gradient(${stops})"></span>Each lived`
    items.push(item)
  }
  base.after(...items)
}

function render() {
  const places = viewPlaces()
  const flights = viewFlights()
  const flightsMode = mode === 'flights'
  setPressed('.mode-btn', 'mode', mode)
  setPressed('.person-btn', 'person', personParam)
  renderNames()
  caption.textContent = captionFor(places, flights, flightsMode)
  legend.hidden = flightsMode
  renderLivedLegend(places)
  legend.querySelector('.shared-key').hidden = !places.some((place) => place.shared && !livedBy(place).length && !wentTogether(place))
  legend.querySelector('.together-key').hidden = !places.some(wentTogether)
  stage.classList.toggle('is-flights', flightsMode)
  const arcPeople = selectedPeople()
  const arcs = flightsMode
    ? arcPeople.flatMap((person, index) =>
        routeArcs(person.flights.airports, person.flights.routes, index === 0 ? flightColor : [0.95, 0.55, 0.2]),
      )
    : []
  globe.update({
    markers: flightsMode ? airportMarkers(flights.airports, flightColor) : markersFor(places),
    arcs,
  })
  renderAnchors(places, flights, flightsMode)
  requestAnimationFrame(() => {
    const parent = frameEl()
    parent?.querySelectorAll('.flight-label, .marker-label, .marker-hit, .pulse, .polaroid, .together-dot, .lived-split').forEach((node) => {
      parent.append(node)
    })
  })
}

app.querySelector('.switch').addEventListener('click', (event) => {
  const modeButton = event.target.closest('.mode-btn')
  const personButton = event.target.closest('.person-btn')
  if (modeButton) mode = modeButton.dataset.mode
  if (personButton) {
    personParam = personButton.dataset.person
    withIds = []
    writeUrl()
  }
  if (!modeButton && !personButton) return
  card.hidden = true
  render()
})

namesEl.addEventListener('click', (event) => {
  const button = event.target.closest('[data-with]')
  if (!button) return
  const id = button.dataset.with
  withIds = withIds.includes(id) ? withIds.filter((item) => item !== id) : [...withIds, id]
  card.hidden = true
  writeUrl()
  render()
})

stage.addEventListener('click', (event) => {
  const hit = event.target.closest('.marker-hit')
  if (!hit) return
  const place = viewPlaces().find((item) => item.id === hit.dataset.place)
  if (place) showCard(place, viewFlights())
})

card.querySelector('.card-close').addEventListener('click', () => {
  card.hidden = true
  state.focus = null
})

let spin = 1
let pointerX = 0
let pointerY = 0
let phiAtDrag = 0
let thetaAtDrag = 0

canvas.addEventListener('pointerdown', (event) => {
  state.dragging = true
  state.focus = null
  canvas.classList.add('is-dragging')
  canvas.setPointerCapture(event.pointerId)
  pointerX = event.clientX
  pointerY = event.clientY
  phiAtDrag = state.phi
  thetaAtDrag = state.theta
})

canvas.addEventListener('pointermove', (event) => {
  if (!state.dragging) return
  state.phi = phiAtDrag + (event.clientX - pointerX) / 260
  state.theta = Math.max(-1, Math.min(1, thetaAtDrag + (event.clientY - pointerY) / 420))
})

function stopDrag(event) {
  if (!state.dragging) return
  state.dragging = false
  canvas.classList.remove('is-dragging')
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
}

canvas.addEventListener('pointerup', stopDrag)
canvas.addEventListener('pointercancel', stopDrag)
canvas.addEventListener('pointerenter', () => {
  spin = 0.8
})
canvas.addEventListener('pointerleave', () => {
  spin = 1
})

function viewSize() {
  return {
    width: Math.max(stage.clientWidth, 1),
    height: Math.max(stage.clientHeight, 1),
  }
}

let ready = false
const globe = createGlobe(canvas, {
  devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  ...viewSize(),
  phi: state.phi,
  theta: state.theta,
  dark: 0,
  diffuse: 1.2,
  mapSamples: 16000,
  mapBrightness: 6,
  mapBaseBrightness: 0,
  baseColor: [1, 1, 1],
  markerColor: [0, 0.271, 0.965],
  glowColor: [1, 1, 1],
  markerElevation: 0,
  markers: [],
  arcs: [],
  arcColor: flightColor,
  arcWidth: 0.45,
  arcHeight: 0.25,
  scale: 1,
  offset: [0, 0],
})

function stepToward(current, target) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + delta * 0.08
}

function frame() {
  if (state.focus && !state.dragging) {
    state.phi = stepToward(state.phi, state.focus.phi)
    state.theta += (state.focus.theta - state.theta) * 0.08
    if (Math.abs(state.focus.phi - state.phi) < 0.01 && Math.abs(state.focus.theta - state.theta) < 0.01) {
      state.focus = null
    }
  } else if (!state.dragging) {
    state.phi += 0.003 * spin
  }
  globe.update({ phi: state.phi, theta: state.theta, ...(!ready ? viewSize() : {}) })
  if (!ready) {
    ready = true
    canvas.classList.add('is-ready')
    render()
  }
  raf = requestAnimationFrame(frame)
}

let raf = 0
raf = requestAnimationFrame(frame)
window.addEventListener('resize', () => globe.update(viewSize()))

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(raf)
    globe.destroy()
  })
}
