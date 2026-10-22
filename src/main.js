import createGlobe from 'cobe'
import {
  airportLabel,
  airportMarkers,
  airports,
  flightColor,
  flightCount,
  routeArcs,
  routes,
} from './flights.js'
import { MARKER_COLOR, MARKER_SIZE, counts, focusAngles, places } from './places.js'
import './style.css'

const state = {
  phi: focusAngles(28, 12).phi,
  theta: 0.2,
  dragging: false,
}

const totals = counts(places)
const app = document.querySelector('#app')
app.innerHTML = `
  <main class="page">
    <section class="stage" aria-label="Globe">
      <canvas></canvas>
    </section>
    <div class="switch" role="tablist" aria-label="Globe view">
      <button class="switch-btn" type="button" data-mode="places" aria-pressed="true">Places</button>
      <button class="switch-btn" type="button" data-mode="flights" aria-pressed="false">Flights</button>
    </div>
    <p class="caption">${totals.lived} lived · ${totals.been} been · ${totals.wish} wish</p>
    <ul class="legend">
      <li><span class="dot lived"></span>Lived</li>
      <li><span class="dot been"></span>Been</li>
      <li><span class="dot wish"></span>Wish</li>
    </ul>
  </main>
`

const canvas = app.querySelector('canvas')
const stage = app.querySelector('.stage')
const caption = app.querySelector('.caption')
const legend = app.querySelector('.legend')
const placesCaption = caption.textContent
const flightsCaption = `${flightCount} flights · ${routes.length} routes`

function markersFor() {
  return places.map((place) => ({
    id: place.id,
    location: place.location,
    size: MARKER_SIZE[place.status],
    color: MARKER_COLOR[place.status],
  }))
}

function labelFor(place) {
  if (place.name === 'United States of America') return 'United States'
  return place.name
}

let spin = 1
let pointerX = 0
let pointerY = 0
let phiAtDrag = 0
let thetaAtDrag = 0

canvas.addEventListener('pointerdown', (event) => {
  state.dragging = true
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
  const width = Math.max(stage.clientWidth, 1)
  const height = Math.max(stage.clientHeight, 1)
  return { width, height }
}

function resize() {
  globe.update(viewSize())
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
  markerColor: MARKER_COLOR.been,
  glowColor: [1, 1, 1],
  markerElevation: 0,
  markers: markersFor(),
  arcs: [],
  arcColor: flightColor,
  arcWidth: 0.45,
  arcHeight: 0.25,
  scale: 1,
  offset: [0, 0],
})

function showMode(mode) {
  const flights = mode === 'flights'
  for (const button of app.querySelectorAll('.switch-btn')) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode))
  }
  caption.textContent = flights ? flightsCaption : placesCaption
  legend.hidden = flights
  stage.classList.toggle('is-flights', flights)
  globe.update({
    markers: flights ? airportMarkers(flightColor) : markersFor(),
    arcs: flights ? routeArcs() : [],
  })
  placeLabels()
}

app.querySelector('.switch').addEventListener('click', (event) => {
  const button = event.target.closest('.switch-btn')
  if (!button) return
  showMode(button.dataset.mode)
})

const frameEl = canvas.parentElement

function placeLabels() {
  for (const label of frameEl.querySelectorAll('.flight-label, .marker-label')) {
    frameEl.append(label)
  }
}

for (const code of Object.keys(airports)) {
  const label = document.createElement('div')
  label.className = 'flight-label'
  label.textContent = airportLabel(code)
  label.style.positionAnchor = `--cobe-apt-${code.toLowerCase()}`
  label.style.opacity = `var(--cobe-visible-apt-${code.toLowerCase()}, 0)`
  frameEl.append(label)
}
for (const place of places.filter((place) => place.status === 'lived')) {
  const label = document.createElement('div')
  label.className = 'marker-label'
  label.textContent = labelFor(place)
  label.style.positionAnchor = `--cobe-${place.id}`
  label.style.opacity = `var(--cobe-visible-${place.id}, 0)`
  frameEl.append(label)
}

function frame() {
  if (!state.dragging) state.phi += 0.003 * spin
  globe.update({ phi: state.phi, theta: state.theta })
  if (!ready) {
    ready = true
    canvas.classList.add('is-ready')
    resize()
    placeLabels()
  }
  raf = requestAnimationFrame(frame)
}

let raf = 0
raf = requestAnimationFrame(frame)
window.addEventListener('resize', resize)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(raf)
    globe.destroy()
  })
}
