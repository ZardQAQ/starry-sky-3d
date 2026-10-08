import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js'
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js'
import type { SolarParams } from '@/presets/solarPresets'
import { mulberry32, smoothstep } from '@/three/rand'
import { makeVignettePass } from '@/three/passes'
import { isWebglAvailable } from '@/three/isWebglAvailable'
import { createLabelSprite } from '@/three/labels'
import { getRenderPixelRatio, isMobileExperience } from '@/lib/device'

export type SolarPlanetId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'

export type SolarStageApi = {
  setParams: (next: SolarParams) => void
  focusPlanet: (id: SolarPlanetId) => void
  lockPlanet: (id: SolarPlanetId) => void
  unlockPlanet: () => void
  resetView: () => void
  capturePngBlob: () => Promise<Blob>
  dispose: () => void
}

type PlanetDef = {
  id: SolarPlanetId
  name: string
  size: number
  dist: number
  orbitSpeed: number
  spinSpeed: number
  colorA: string
  colorB: string
  ring?: { inner: number; outer: number; tilt: number; color: string }
}

const planets: PlanetDef[] = [
  { id: 'mercury', name: '水星', size: 1.4, dist: 20, orbitSpeed: 1.7, spinSpeed: 1.9, colorA: '#a7a0a0', colorB: '#3a2f30' },
  { id: 'venus', name: '金星', size: 2.1, dist: 28, orbitSpeed: 1.25, spinSpeed: 1.2, colorA: '#e7c28a', colorB: '#805a2d' },
  { id: 'earth', name: '地球', size: 2.2, dist: 37, orbitSpeed: 1.0, spinSpeed: 2.2, colorA: '#1f7fff', colorB: '#12e3d7' },
  { id: 'mars', name: '火星', size: 1.8, dist: 46, orbitSpeed: 0.82, spinSpeed: 2.0, colorA: '#ff6a3d', colorB: '#6a1d10' },
  { id: 'jupiter', name: '木星', size: 6.4, dist: 62, orbitSpeed: 0.52, spinSpeed: 2.7, colorA: '#f5c9a5', colorB: '#b57a49' },
  {
    id: 'saturn',
    name: '土星',
    size: 5.8,
    dist: 82,
    orbitSpeed: 0.42,
    spinSpeed: 2.4,
    colorA: '#f1d9a7',
    colorB: '#8a6a35',
    ring: { inner: 7.3, outer: 11.8, tilt: 0.42, color: '#c7b08b' },
  },
  { id: 'uranus', name: '天王星', size: 4.1, dist: 102, orbitSpeed: 0.32, spinSpeed: 1.8, colorA: '#66e6ff', colorB: '#2d7aa3' },
  { id: 'neptune', name: '海王星', size: 4.0, dist: 120, orbitSpeed: 0.26, spinSpeed: 1.9, colorA: '#3c7bff', colorB: '#07225b' },
]

function setUniform(pass: any, key: string, value: number) {
  const u = pass?.uniforms?.[key] ?? pass?.material?.uniforms?.[key]
  if (u && typeof u === 'object' && 'value' in u) {
    u.value = value
  }
}

function makePlanetTexture(seed: number, a: string, b: string) {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = b
  ctx.fillRect(0, 0, size, size)

  const rand = mulberry32(seed)
  for (let i = 0; i < 5200; i += 1) {
    const x = rand() * size
    const y = rand() * size
    const r = 1 + rand() * 10
    const alpha = 0.02 + rand() * 0.08
    ctx.fillStyle = `${a}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  for (let i = 0; i < 220; i += 1) {
    const y = rand() * size
    const h = 6 + rand() * 28
    const alpha = 0.08 + rand() * 0.18
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.fillRect(0, y, size, h)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 1)
  tex.anisotropy = 8
  return tex
}

function makeOrbitLine(radius: number, color: number) {
  const seg = 256
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= seg; i += 1) {
    const t = (i / seg) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius))
  }
  const geom = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.28 })
  return new THREE.Line(geom, mat)
}

export function createSolarSystemStage(container: HTMLElement, initial: SolarParams): SolarStageApi {
  if (!isWebglAvailable()) {
    throw new Error('WEBGL_UNAVAILABLE')
  }

  const clock = new THREE.Clock()
  const mobile = isMobileExperience()
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  scene.fog = new THREE.FogExp2(0x05060a, 0.0018)

  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 2200)
  if (mobile) {
    camera.position.set(0, 68, 248)
  } else {
    camera.position.set(0, 52, 168)
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  container.appendChild(renderer.domElement)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1, 0.6, 0.2)
  composer.addPass(bloomPass)
  const afterimagePass = new AfterimagePass()
  composer.addPass(afterimagePass)
  const filmPass = new FilmPass(0.28, 0.18, 648, false)
  composer.addPass(filmPass)
  const vignettePass = makeVignettePass()
  composer.addPass(vignettePass)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = !mobile
  controls.panSpeed = 0.7
  controls.enableZoom = true
  controls.zoomSpeed = mobile ? 1.15 : 0.9
  controls.rotateSpeed = mobile ? 0.85 : 1
  controls.minDistance = 18
  controls.maxDistance = 420
  controls.target.set(0, 0, 0)
  if (mobile) {
    controls.touches.ONE = THREE.TOUCH.ROTATE
    controls.touches.TWO = THREE.TOUCH.DOLLY
  }
  controls.update()

  const root = new THREE.Group()
  scene.add(root)

  const ambient = new THREE.AmbientLight(0x3a4b66, 0.92)
  scene.add(ambient)

  const hemi = new THREE.HemisphereLight(0x8cc7ff, 0x0a0b12, 0.45)
  scene.add(hemi)

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.35)
  keyLight.position.set(1.2, 1.0, 0.6)
  scene.add(keyLight)

  const sunLight = new THREE.PointLight(0xffe4b5, 1.25, 0, 1.25)
  sunLight.position.set(0, 0, 0)
  scene.add(sunLight)

  const sunGeom = new THREE.SphereGeometry(9.5, 64, 64)
  const sunMat = new THREE.MeshStandardMaterial({
    color: 0xffb14b,
    emissive: 0xffc56a,
    emissiveIntensity: 0.95,
    metalness: 0,
    roughness: 0.35,
  })
  const sun = new THREE.Mesh(sunGeom, sunMat)
  root.add(sun)

  const coronaGeom = new THREE.SphereGeometry(12.6, 48, 48)
  const coronaMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending })
  const corona = new THREE.Mesh(coronaGeom, coronaMat)
  root.add(corona)

  const starsGeom = new THREE.BufferGeometry()
  const starCount = mobile ? 1600 : 2800
  const starPos = new Float32Array(starCount * 3)
  const rand = mulberry32(initial.seed)
  for (let i = 0; i < starCount; i += 1) {
    const r = 900 * Math.pow(rand(), 0.35) + 240
    const u = rand()
    const v = rand()
    const theta = u * Math.PI * 2
    const phi = Math.acos(2 * v - 1)
    starPos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta)
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    starPos[i * 3 + 2] = r * Math.cos(phi)
  }
  starsGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  const starsMat = new THREE.PointsMaterial({ size: 1.2, color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false })
  const stars = new THREE.Points(starsGeom, starsMat)
  scene.add(stars)

  const orbitGroup = new THREE.Group()
  root.add(orbitGroup)

  const planetNodes = new Map<SolarPlanetId, { pivot: THREE.Group; mesh: THREE.Mesh; label?: THREE.Sprite; extras: THREE.Object3D[]; tex?: THREE.Texture }>()

  const baseGeom = new THREE.SphereGeometry(1, 48, 48)
  planets.forEach((p, idx) => {
    const pivot = new THREE.Group()
    pivot.rotation.y = mulberry32(initial.seed * 17 + idx * 13)() * Math.PI * 2
    root.add(pivot)

    const tex = makePlanetTexture(initial.seed * 31 + idx * 97, p.colorA, p.colorB)
    const baseColor = new THREE.Color(p.colorA)
    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      map: tex ?? undefined,
      emissive: baseColor,
      emissiveIntensity: 0.16,
      metalness: 0.02,
      roughness: 0.68,
    })

    const mesh = new THREE.Mesh(baseGeom, mat)
    mesh.position.set(p.dist, 0, 0)
    mesh.scale.setScalar(p.size)
    pivot.add(mesh)

    const extras: THREE.Object3D[] = []
    if (p.ring) {
      const ringGeom = new THREE.RingGeometry(p.ring.inner, p.ring.outer, 96, 1)
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(p.ring.color),
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const ring = new THREE.Mesh(ringGeom, ringMat)
      ring.rotation.x = Math.PI / 2
      ring.rotation.z = p.ring.tilt
      ring.position.copy(mesh.position)
      pivot.add(ring)
      extras.push(ring)
    }

    const orbit = makeOrbitLine(p.dist, 0x9ad8ff)
    orbitGroup.add(orbit)

    const labelPkg = createLabelSprite(p.name)
    if (labelPkg) {
      labelPkg.sprite.position.copy(mesh.position).add(new THREE.Vector3(0, p.size + 4.2, 0))
      labelPkg.sprite.renderOrder = 10
      pivot.add(labelPkg.sprite)
      extras.push(labelPkg.sprite)
      planetNodes.set(p.id, { pivot, mesh, label: labelPkg.sprite, extras, tex: tex ?? undefined })
    } else {
      planetNodes.set(p.id, { pivot, mesh, extras, tex: tex ?? undefined })
    }
  })

  let params: SolarParams = { ...initial }

  const resize = () => {
    const w = container.clientWidth
    const h = container.clientHeight
    const dpr = Math.max(1, getRenderPixelRatio())
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, true)
    composer.setPixelRatio(dpr)
    composer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    bloomPass.setSize(w, h)

    if (mobile && h > w) {
      const aspect = w / h
      const dist = THREE.MathUtils.lerp(248, 340, 1 - aspect)
      camera.position.set(0, 68, dist)
      controls.update()
    }
  }

  const ro = new ResizeObserver(resize)
  ro.observe(container)
  resize()

  const focusState = {
    active: false,
    mode: 'orbit' as 'orbit' | 'translate',
    to: new THREE.Vector3(0, 0, 0),
    from: new THREE.Vector3(0, 0, 0),
    offsetFrom: new THREE.Vector3(0, 0, 0),
    offsetTo: new THREE.Vector3(0, 0, 0),
    t: 0,
    dur: 0.65,
    distFrom: 140,
    distTo: 90,
  }

  const defaultControls = {
    enableRotate: controls.enableRotate,
    enablePan: controls.enablePan,
    minPolarAngle: controls.minPolarAngle,
    maxPolarAngle: controls.maxPolarAngle,
  }

  const startFocus = (to: THREE.Vector3, dist: number) => {
    focusState.active = true
    focusState.mode = 'orbit'
    focusState.from.copy(controls.target)
    focusState.to.copy(to)
    focusState.t = 0
    focusState.distFrom = camera.position.distanceTo(controls.target)
    focusState.distTo = dist
    ;(controls as any).enabled = false
  }

  const startTranslateFocus = (to: THREE.Vector3, dist: number) => {
    focusState.active = true
    focusState.mode = 'translate'
    focusState.from.copy(controls.target)
    focusState.to.copy(to)
    focusState.t = 0
    focusState.offsetFrom.copy(camera.position).sub(controls.target)
    focusState.offsetTo.set(0, dist, 0.001)
    ;(controls as any).enabled = false
  }

  const updateFocus = (dt: number) => {
    if (!focusState.active) return
    focusState.t = Math.min(1, focusState.t + dt / focusState.dur)
    const k = smoothstep(0, 1, focusState.t)

    if (focusState.mode === 'translate') {
      controls.target.lerpVectors(focusState.from, focusState.to, k)
      tmpOffset.lerpVectors(focusState.offsetFrom, focusState.offsetTo, k)
      camera.position.copy(controls.target).add(tmpOffset)
      camera.lookAt(controls.target)
    } else {
      controls.target.lerpVectors(focusState.from, focusState.to, k)
      const dist = THREE.MathUtils.lerp(focusState.distFrom, focusState.distTo, k)
      const dir = camera.position.clone().sub(controls.target).normalize()
      camera.position.copy(controls.target).addScaledVector(dir, dist)
      camera.lookAt(controls.target)
    }

    if (focusState.t >= 1) {
      focusState.active = false
      ;(controls as any).enabled = true
      controls.update()
    }
  }

  let lockedPlanetId: SolarPlanetId | null = null
  let pendingLockId: SolarPlanetId | null = null
  let planarLock = false
  let justAppliedLock = false
  const tmpOffset = new THREE.Vector3()

  const applyPlanarLock = (distOverride?: number) => {
    planarLock = true
    controls.enableRotate = false
    controls.enablePan = false
    controls.minPolarAngle = 0.18
    controls.maxPolarAngle = 0.18

    const dist = distOverride ?? camera.position.distanceTo(controls.target)
    camera.position.set(controls.target.x, controls.target.y + dist, controls.target.z + 0.001)
    camera.lookAt(controls.target)
    controls.update()
  }

  const clearPlanarLock = () => {
    planarLock = false
    controls.enableRotate = defaultControls.enableRotate
    controls.enablePan = defaultControls.enablePan
    controls.minPolarAngle = defaultControls.minPolarAngle
    controls.maxPolarAngle = defaultControls.maxPolarAngle
    controls.update()
  }

  const applyLockFollow = () => {
    if (focusState.active) return
    if (!lockedPlanetId) return
    const node = planetNodes.get(lockedPlanetId)
    if (!node) return
    const next = new THREE.Vector3()
    node.mesh.getWorldPosition(next)
    const delta = next.clone().sub(controls.target)
    controls.target.copy(next)
    camera.position.add(delta)
  }

  let raf = 0
  const tick = () => {
    raf = window.requestAnimationFrame(tick)
    const dt = Math.min(0.04, clock.getDelta())
    const t = clock.elapsedTime
    justAppliedLock = false

    const time = dt * params.timeScale

    sun.rotation.y += time * 0.22
    corona.rotation.y -= time * 0.16
    corona.scale.setScalar(1 + Math.sin(t * 0.6) * 0.02)

    stars.rotation.y += dt * 0.012

    planets.forEach((p) => {
      const node = planetNodes.get(p.id)
      if (!node) return
      const orbitSpeed = p.orbitSpeed * 0.18 * params.timeScale
      node.pivot.rotation.y += dt * orbitSpeed
      node.mesh.rotation.y += dt * (p.spinSpeed * 0.65) * params.timeScale
      const s = params.planetScale
      node.mesh.scale.setScalar(p.size * s)
      if (p.ring) {
        node.extras.forEach((e) => {
          if (e !== node.mesh && e.type === 'Mesh') {
            e.position.set(p.dist * params.orbitScale, 0, 0)
            e.scale.setScalar(s)
          }
        })
      }
      node.mesh.position.set(p.dist * params.orbitScale, 0, 0)
      if (node.label) {
        node.label.visible = params.showLabels
        node.label.position.copy(node.mesh.position).add(new THREE.Vector3(0, p.size * s + 4.2, 0))
      }
    })

    orbitGroup.visible = params.showOrbits
    orbitGroup.scale.setScalar(params.orbitScale)
    bloomPass.strength = params.bloomStrength
    bloomPass.radius = params.bloomRadius
    bloomPass.threshold = params.bloomThreshold
    setUniform(afterimagePass, 'damp', params.afterimage)
    setUniform(filmPass, 'nIntensity', params.grain)
    setUniform(filmPass, 'sIntensity', params.grain * 0.65)
    setUniform(vignettePass, 'uStrength', params.vignette)

    updateFocus(dt)
    if (focusState.active) {
      composer.render()
      return
    }
    if (!focusState.active && pendingLockId) {
      lockedPlanetId = pendingLockId
      pendingLockId = null
      if (!planarLock) applyPlanarLock()
      justAppliedLock = true
    }
    if (!justAppliedLock) applyLockFollow()
    controls.update()
    composer.render()
  }

  raf = window.requestAnimationFrame(tick)

  const setParams = (next: SolarParams) => {
    params = { ...next }
    const r = mulberry32(params.seed)
    for (let i = 0; i < starCount; i += 1) {
      const rr = 900 * Math.pow(r(), 0.35) + 240
      const u = r()
      const v = r()
      const theta = u * Math.PI * 2
      const phi = Math.acos(2 * v - 1)
      starPos[i * 3 + 0] = rr * Math.sin(phi) * Math.cos(theta)
      starPos[i * 3 + 1] = rr * Math.sin(phi) * Math.sin(theta)
      starPos[i * 3 + 2] = rr * Math.cos(phi)
    }
    ;(stars.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true
  }

  const focusPlanet = (id: SolarPlanetId) => {
    const node = planetNodes.get(id)
    if (!node) return
    const world = new THREE.Vector3()
    node.mesh.getWorldPosition(world)
    startFocus(world, Math.max(26, node.mesh.scale.x * 10 + 34))
  }

  const lockPlanet = (id: SolarPlanetId) => {
    const node = planetNodes.get(id)
    if (!node) return
    const world = new THREE.Vector3()
    node.mesh.getWorldPosition(world)
    const dist = Math.max(70, node.mesh.scale.x * 18 + 70)

    if (!planarLock) applyPlanarLock(dist)
    pendingLockId = id
    startTranslateFocus(world, dist)
  }

  const unlockPlanet = () => {
    lockedPlanetId = null
    pendingLockId = null
    if (planarLock) clearPlanarLock()
  }

  const resetView = () => {
    unlockPlanet()
    const dist = mobile ? 248 : 160
    startFocus(new THREE.Vector3(0, 0, 0), dist)
  }

  const capturePngBlob = () =>
    new Promise<Blob>((resolve, reject) => {
      renderer.domElement.toBlob((b) => {
        if (!b) reject(new Error('capture failed'))
        else resolve(b)
      }, 'image/png')
    })

  const dispose = () => {
    window.cancelAnimationFrame(raf)
    ro.disconnect()
    controls.dispose()
    baseGeom.dispose()
    sunGeom.dispose()
    coronaGeom.dispose()
    sunMat.dispose()
    coronaMat.dispose()
    starsGeom.dispose()
    starsMat.dispose()
    orbitGroup.traverse((o) => {
      if ((o as any).geometry) (o as any).geometry.dispose()
      if ((o as any).material) (o as any).material.dispose()
    })
    planetNodes.forEach((n) => {
      const m = n.mesh.material as THREE.MeshStandardMaterial
      m.dispose()
      n.tex?.dispose()
      n.extras.forEach((e) => {
        const mat = (e as any).material
        const geom = (e as any).geometry
        if (geom?.dispose) geom.dispose()
        if (mat?.dispose) mat.dispose()
      })
    })
    composer.passes.forEach((p: any) => {
      if (p?.dispose) p.dispose()
    })
    composer.renderTarget1.dispose()
    composer.renderTarget2.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }

  return { setParams, focusPlanet, lockPlanet, unlockPlanet, resetView, capturePngBlob, dispose }
}
