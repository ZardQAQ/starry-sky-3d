import type { StarParams } from '@/presets/starPresets'

type NumberKeys = {
  [K in keyof StarParams]: StarParams[K] extends number ? K : never
}[keyof StarParams]

const keyMap: Record<NumberKeys, string> = {
  seed: 'seed',
  density: 'd',
  radius: 'r',
  drift: 'dr',
  warp: 'w',
  twinkle: 't',
  nebula: 'n',
  meteorRate: 'm',
  bloomStrength: 'bs',
  bloomRadius: 'br',
  bloomThreshold: 'bt',
  trail: 'tr',
  vignette: 'v',
  grain: 'g',
  hueShift: 'h',
}

const ranges: Record<NumberKeys, readonly [number, number]> = {
  seed: [1, 999],
  density: [0.3, 1.6],
  radius: [160, 420],
  drift: [0, 0.6],
  warp: [0, 1],
  twinkle: [0, 1],
  nebula: [0, 1.4],
  meteorRate: [0, 1],
  bloomStrength: [0, 2.2],
  bloomRadius: [0, 1],
  bloomThreshold: [0, 0.9],
  trail: [0, 0.96],
  vignette: [0, 1],
  grain: [0, 0.8],
  hueShift: [-1, 1],
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function readParamsFromUrl(base: StarParams): StarParams {
  const url = new URL(window.location.href)
  const next: StarParams = { ...base }

  ;(Object.keys(keyMap) as NumberKeys[]).forEach((k) => {
    const q = url.searchParams.get(keyMap[k])
    if (q == null || q === '') return
    const n = Number(q)
    if (!Number.isFinite(n)) return
    const [min, max] = ranges[k]
    next[k] = clamp(n, min, max) as StarParams[typeof k]
  })

  return next
}

export function writeParamsToUrl(params: StarParams) {
  const url = new URL(window.location.href)
  ;(Object.keys(keyMap) as NumberKeys[]).forEach((k) => {
    url.searchParams.set(keyMap[k], String(params[k]))
  })
  window.history.replaceState(null, '', url.toString())
}

