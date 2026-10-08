import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js'
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js'
import type { StarParams } from '@/presets/starPresets'
import { mulberry32, smoothstep } from '@/three/rand'
import { makeNebulaTexture } from '@/three/nebulaTexture'
import { createStarMaterial, makeStarGeometry } from '@/three/starfield'
import { makeVignettePass } from '@/three/passes'

export type StarStage = {
  setParams: (next: StarParams) => void
  capturePngBlob: () => Promise<Blob>
  dispose: () => void
}

function isWebGLAvailable() {
  const canvas = document.createElement('canvas')
  const gl =
    canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
    canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true }) ||
    canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: true })
  return !!gl
}

function setUniform(pass: any, key: string, value: number) {
  const u = pass?.uniforms?.[key] ?? pass?.material?.uniforms?.[key]
  if (u && typeof u === 'object' && 'value' in u) {
    u.value = value
  }
}

export function createStarStage(container: HTMLElement, initial: StarParams): StarStage {
  if (!isWebGLAvailable()) {
    throw new Error('WEBGL_UNAVAILABLE')
  }

  const clock = new THREE.Clock()
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  scene.fog = new THREE.FogExp2(0x06060b, 0.0022)

  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 1200)
  camera.position.set(0, 0, 160)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x000000, 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95
  container.appendChild(renderer.domElement)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1, 0.6, 0.15)
  composer.addPass(bloomPass)

  const afterimagePass = new AfterimagePass()
  composer.addPass(afterimagePass)

  const filmPass = new FilmPass(0.28, 0.18, 648, false)
  composer.addPass(filmPass)

  const vignettePass = makeVignettePass()
  composer.addPass(vignettePass)

  const group = new THREE.Group()
  scene.add(group)

  let params: StarParams = { ...initial }
  const rand = mulberry32(params.seed)

  const { material: baseStarMaterial, uniforms: starUniforms } = createStarMaterial({
    twinkle: params.twinkle,
    warp: params.warp,
    hueShift: params.hueShift,
  })

  const nebulaTextures: THREE.Texture[] = []
  const nebulaSprites: THREE.Sprite[] = []

  const makeNebulaLayer = (index: number) => {
    const tex = makeNebulaTexture(params.seed * 13 + index * 97, (0.62 + params.hueShift + index * 0.14 + 1) % 1)
    if (!tex) return
    nebulaTextures.push(tex)
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.55,
    })
    const sprite = new THREE.Sprite(mat)
    sprite.position.set((rand() - 0.5) * 120, (rand() - 0.5) * 80, -80 - index * 120)
    sprite.scale.setScalar(260 + index * 160)
    nebulaSprites.push(sprite)
    group.add(sprite)
  }

  const disposeNebula = () => {
    nebulaSprites.forEach((s) => {
      group.remove(s)
      s.material.dispose()
    })
    nebulaSprites.length = 0
    nebulaTextures.forEach((t) => t.dispose())
    nebulaTextures.length = 0
  }

  let starGeom: THREE.BufferGeometry | null = null
  let stars: THREE.Points | null = null

  const rebuildStars = () => {
    if (stars) {
      group.remove(stars)
      ;(stars.material as THREE.Material).dispose()
      starGeom?.dispose()
      stars = null
      starGeom = null
    }

    const count = Math.floor(52000 * params.density)
    starGeom = makeStarGeometry(params.seed, count, params.radius)
    stars = new THREE.Points(starGeom, baseStarMaterial.clone())
    group.add(stars)
  }

  const meteorGroup = new THREE.Group()
  scene.add(meteorGroup)

  const meteors: {
    line: THREE.Line
    life: number
    maxLife: number
    speed: number
    dir: THREE.Vector3
  }[] = []

  const spawnMeteor = () => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(2 * 3)
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    })
    const line = new THREE.Line(geometry, material)

    const start = new THREE.Vector3((rand() - 0.5) * 240, (rand() - 0.5) * 140, -40 - rand() * 260)
    const dir = new THREE.Vector3(-0.9 - rand() * 0.8, -0.2 - rand() * 0.6, -0.4 - rand() * 0.8).normalize()

    const speed = 120 + rand() * 220
    const maxLife = 0.35 + rand() * 0.55

    const end = start.clone().addScaledVector(dir, 32 + rand() * 70)
    positions.set([start.x, start.y, start.z, end.x, end.y, end.z])
    geometry.attributes.position.needsUpdate = true

    meteorGroup.add(line)
    meteors.push({ line, life: 0, maxLife, speed, dir })
  }

  const disposeMeteors = () => {
    meteors.forEach((m) => {
      meteorGroup.remove(m.line)
      m.line.geometry.dispose()
      ;(m.line.material as THREE.Material).dispose()
    })
    meteors.length = 0
  }

  rebuildStars()
  for (let i = 0; i < 3; i += 1) makeNebulaLayer(i)
  for (let i = 0; i < 3; i += 1) spawnMeteor()

  const pointer = new THREE.Vector2(0, 0)
  const pointerTarget = new THREE.Vector2(0, 0)
  const cameraVel = new THREE.Vector2(0, 0)
  let timeScale = 1

  const onPointerMove = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    pointerTarget.set((x - 0.5) * 2, (y - 0.5) * 2)
  }

  const onWheel = (e: WheelEvent) => {
    const n = e.deltaY > 0 ? -1 : 1
    timeScale = Math.max(0.45, Math.min(2.8, timeScale + n * 0.14))
  }

  container.addEventListener('pointermove', onPointerMove, { passive: true })
  container.addEventListener('wheel', onWheel, { passive: true })

  const resize = () => {
    const w = container.clientWidth
    const h = container.clientHeight
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    composer.setPixelRatio(dpr)
    composer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    bloomPass.setSize(w, h)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(container)
  resize()

  let raf = 0
  const tick = () => {
    raf = window.requestAnimationFrame(tick)
    const dt = Math.min(0.04, clock.getDelta())
    const t = clock.elapsedTime

    pointer.lerp(pointerTarget, 1 - Math.pow(0.001, dt))
    cameraVel.lerp(pointer, 1 - Math.pow(0.0007, dt))

    const sway = 14 + params.warp * 26
    camera.position.x = cameraVel.x * sway
    camera.position.y = -cameraVel.y * (sway * 0.72)
    camera.lookAt(0, 0, 0)

    starUniforms.uTime.value = t * (0.55 + params.drift * 1.2) * timeScale
    starUniforms.uTwinkle.value = params.twinkle
    starUniforms.uWarp.value = params.warp
    starUniforms.uHueShift.value = params.hueShift

    nebulaSprites.forEach((s, i) => {
      const k = 0.12 + i * 0.08
      s.material.opacity = params.nebula * (0.22 + i * 0.14)
      s.position.x += Math.sin(t * (0.18 + i * 0.08)) * k * dt * 18
      s.position.y += Math.cos(t * (0.14 + i * 0.06)) * k * dt * 14
      s.material.rotation = Math.sin(t * (0.06 + i * 0.03)) * 0.22
    })

    const spawnChance = smoothstep(0.08, 1, params.meteorRate) * dt * 3.2
    if (rand() < spawnChance) spawnMeteor()

    for (let i = meteors.length - 1; i >= 0; i -= 1) {
      const m = meteors[i]
      m.life += dt * (0.8 + params.drift * 1.8)
      const a = 1 - smoothstep(0.15, 1, m.life / m.maxLife)
      ;(m.line.material as THREE.LineBasicMaterial).opacity = a * 0.75
      const pos = (m.line.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute
      const sx = pos.getX(0) + m.dir.x * m.speed * dt
      const sy = pos.getY(0) + m.dir.y * m.speed * dt
      const sz = pos.getZ(0) + m.dir.z * m.speed * dt
      const ex = pos.getX(1) + m.dir.x * m.speed * dt
      const ey = pos.getY(1) + m.dir.y * m.speed * dt
      const ez = pos.getZ(1) + m.dir.z * m.speed * dt
      pos.setXYZ(0, sx, sy, sz)
      pos.setXYZ(1, ex, ey, ez)
      pos.needsUpdate = true
      if (m.life >= m.maxLife) {
        meteorGroup.remove(m.line)
        m.line.geometry.dispose()
        ;(m.line.material as THREE.Material).dispose()
        meteors.splice(i, 1)
      }
    }

    bloomPass.strength = params.bloomStrength
    bloomPass.radius = params.bloomRadius
    bloomPass.threshold = params.bloomThreshold
    setUniform(afterimagePass, 'damp', params.trail)
    setUniform(filmPass, 'nIntensity', params.grain)
    setUniform(filmPass, 'sIntensity', params.grain * 0.65)
    setUniform(vignettePass, 'uStrength', params.vignette)

    composer.render()
  }

  raf = window.requestAnimationFrame(tick)

  const setParams = (next: StarParams) => {
    const prev = params
    params = { ...next }

    if (Math.abs(prev.density - params.density) > 0.02 || Math.abs(prev.radius - params.radius) > 1 || prev.seed !== params.seed) {
      disposeNebula()
      rebuildStars()
      for (let i = 0; i < 3; i += 1) makeNebulaLayer(i)
      disposeMeteors()
      for (let i = 0; i < 3; i += 1) spawnMeteor()
    }
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
    container.removeEventListener('pointermove', onPointerMove)
    container.removeEventListener('wheel', onWheel)
    disposeNebula()
    disposeMeteors()
    if (stars) {
      group.remove(stars)
      ;(stars.material as THREE.Material).dispose()
      starGeom?.dispose()
    }
    composer.passes.forEach((p: any) => {
      if (p?.dispose) p.dispose()
    })
    composer.renderTarget1.dispose()
    composer.renderTarget2.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }

  return { setParams, capturePngBlob, dispose }
}
