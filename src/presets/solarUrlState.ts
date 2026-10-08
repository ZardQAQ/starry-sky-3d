import type { SolarParams } from '@/presets/solarPresets'

type ParamKeys = keyof SolarParams

const keyMap: Record<ParamKeys, string> = {
  seed: 'seed',
  timeScale: 'ts',
  orbitScale: 'os',
  planetScale: 'ps',
  showOrbits: 'or',
  showLabels: 'lb',
  bloomStrength: 'bs',
  bloomRadius: 'br',
  bloomThreshold: 'bt',
  afterimage: 'ai',
  vignette: 'v',
  grain: 'g',
}

const ranges: Partial<Record<ParamKeys, readonly [number, number]>> = {
  seed: [1, 999],
  timeScale: [0.05, 6],
  orbitScale: [0.5, 1.8],
  planetScale: [0.6, 2.2],
  bloomStrength: [0, 2.2],
  bloomRadius: [0, 1],
  bloomThreshold: [0, 0.9],
  afterimage: [0, 0.96],
  vignette: [0, 1],
  grain: [0, 0.8],
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function readBool(v: string | null) {
  if (v == null) return null
  if (v === '1' || v.toLowerCase() === 'true') return true
  if (v === '0' || v.toLowerCase() === 'false') return false
  return null
}

export function readParamsFromUrl(base: SolarParams): SolarParams {
  const url = new URL(window.location.href)
  const next: SolarParams = { ...base }

  ;(Object.keys(keyMap) as ParamKeys[]).forEach((k) => {
    const q = url.searchParams.get(keyMap[k])
    if (q == null || q === '') return

    if (k === 'showOrbits' || k === 'showLabels') {
      const b = readBool(q)
      if (b == null) return
      next[k] = b as SolarParams[typeof k]
      return
    }

    const n = Number(q)
    if (!Number.isFinite(n)) return
    const r = ranges[k]
    if (r) next[k] = clamp(n, r[0], r[1]) as SolarParams[typeof k]
    else next[k] = n as SolarParams[typeof k]
  })

  return next
}

export function writeParamsToUrl(params: SolarParams) {
  const url = new URL(window.location.href)
  ;(Object.keys(keyMap) as ParamKeys[]).forEach((k) => {
    const v = params[k]
    if (typeof v === 'boolean') url.searchParams.set(keyMap[k], v ? '1' : '0')
    else url.searchParams.set(keyMap[k], String(v))
  })
  window.history.replaceState(null, '', url.toString())
}

