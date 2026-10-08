import * as THREE from 'three'
import { mulberry32 } from '@/three/rand'

export function makeNebulaTexture(seed: number, hue: number) {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, size, size)

  const rand = mulberry32(seed)
  for (let i = 0; i < 24; i += 1) {
    const x = rand() * size
    const y = rand() * size
    const r = (0.12 + rand() * 0.52) * size
    const h = (hue + (rand() - 0.5) * 0.25 + 1) % 1
    const s = 0.7 + rand() * 0.25
    const l = 0.45 + rand() * 0.2
    const a = 0.08 + rand() * 0.18

    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `hsla(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${a})`)
    g.addColorStop(0.55, `hsla(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round((l * 0.85) * 100)}%, ${a * 0.42})`)
    g.addColorStop(1, `hsla(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round((l * 0.7) * 100)}%, 0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  for (let i = 0; i < 9000; i += 1) {
    const x = rand() * size
    const y = rand() * size
    const v = rand()
    const a = 0.03 + v * 0.07
    ctx.fillStyle = `rgba(255,255,255,${a})`
    ctx.fillRect(x, y, 1, 1)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

