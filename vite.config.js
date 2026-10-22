import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { slug, groupPlacePhotos } from './src/places.js'

const virtualId = 'virtual:profiles'
const resolvedId = '\0virtual:profiles'
const profileFiles = ['places.csv', 'flights.csv', 'airports.csv']

function readProfileDir(dir) {
  if (!existsSync(dir)) return {}
  const profiles = {}
  for (const name of readdirSync(dir)) {
    const folder = join(dir, name)
    if (!statSync(folder).isDirectory()) continue
    const files = {}
    for (const file of profileFiles) {
      const path = join(folder, file)
      if (existsSync(path)) files[file] = readFileSync(path, 'utf8')
    }
    if (files['places.csv']) profiles[name] = files
  }
  return profiles
}

function readPhotos(dir, urlBase) {
  if (!existsSync(dir)) return {}
  const photos = {}
  for (const file of readdirSync(dir)) {
    const match = file.match(/^(.+)\.(jpg|jpeg|png|webp)$/i)
    if (match) photos[slug(match[1])] = `${urlBase}/${file}`
  }
  return photos
}

function readBundle(root) {
  const privateProfiles = readProfileDir(resolve(root, 'private/profiles'))
  const usePrivate = Object.keys(privateProfiles).length > 0
  const base = usePrivate ? 'private' : 'data'
  const sharedPath = resolve(root, base, 'shared.csv')
  return {
    profiles: usePrivate ? privateProfiles : readProfileDir(resolve(root, 'data/profiles')),
    sharedText: existsSync(sharedPath) ? readFileSync(sharedPath, 'utf8') : '',
    photos: readPhotos(resolve(root, base, 'shared/photos'), `/${base}/shared/photos`),
    assetPhotos: readAssetPhotos(root),
  }
}

function readAssetPhotos(root) {
  const dir = resolve(root, 'assets')
  if (!existsSync(dir)) return {}
  const grouped = groupPlacePhotos(readdirSync(dir))
  return Object.fromEntries(
    Object.entries(grouped).map(([id, files]) => [
      id,
      files.map((file) => {
        const version = Math.floor(statSync(join(dir, file)).mtimeMs)
        return `/assets/${file}?v=${version}`
      }),
    ]),
  )
}

function localProfiles() {
  let root = process.cwd()
  return {
    name: 'local-profiles',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      if (id === virtualId) return resolvedId
    },
    load(id) {
      if (id !== resolvedId) return
      return `export default ${JSON.stringify(readBundle(root))}`
    },
    configureServer(server) {
      let last = JSON.stringify(readBundle(root))
      const reload = () => {
        const next = JSON.stringify(readBundle(root))
        if (next === last) return
        last = next
        const mod = server.moduleGraph.getModuleById(resolvedId)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.add(resolve(root, 'private'))
      server.watcher.add(resolve(root, 'data'))
      server.watcher.add(resolve(root, 'assets'))
      server.watcher.on('add', reload)
      server.watcher.on('change', reload)
      server.watcher.on('unlink', reload)
    },
  }
}

export default {
  plugins: [localProfiles()],
}
