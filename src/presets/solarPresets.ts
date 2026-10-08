export type SolarPresetId = 'hyper' | 'cinema' | 'clean'

export type SolarParams = {
  seed: number
  timeScale: number
  orbitScale: number
  planetScale: number
  showOrbits: boolean
  showLabels: boolean
  bloomStrength: number
  bloomRadius: number
  bloomThreshold: number
  afterimage: number
  vignette: number
  grain: number
}

export type SolarPreset = {
  id: SolarPresetId
  name: string
  tagline: string
  params: SolarParams
}

export const defaultParams: SolarParams = {
  seed: 42,
  timeScale: 1,
  orbitScale: 1,
  planetScale: 1.35,
  showOrbits: true,
  showLabels: true,
  bloomStrength: 0.1,
  bloomRadius: 0.48,
  bloomThreshold: 0,
  afterimage: 0.74,
  vignette: 0.62,
  grain: 0.22,
}

export const presets: SolarPreset[] = [
  {
    id: 'hyper',
    name: '夸张炫酷',
    tagline: '强辉光 · 速度感 · 视觉张力',
    params: {
      ...defaultParams,
      seed: 42,
      timeScale: 1,
      orbitScale: 0.92,
      planetScale: 1.48,
      bloomStrength: 0.1,
      bloomThreshold: 0,
      afterimage: 0.0,
      grain: 0.26,
    },
  },
  {
    id: 'cinema',
    name: '电影质感',
    tagline: '更克制 · 更深邃 · 更稳',
    params: {
      ...defaultParams,
      seed: 17,
      timeScale: 0.9,
      orbitScale: 1,
      planetScale: 1.32,
      bloomStrength: 0.1,
      bloomThreshold: 0,
      afterimage: 0.7,
      grain: 0.18,
      vignette: 0.72,
    },
  },
  {
    id: 'clean',
    name: '清爽观察',
    tagline: '少后期 · 多细节 · 便于观看',
    params: {
      ...defaultParams,
      seed: 9,
      timeScale: 0.8,
      orbitScale: 1.05,
      planetScale: 1.22,
      showOrbits: true,
      showLabels: true,
      bloomStrength: 0.1,
      bloomThreshold: 0,
      afterimage: 0.66,
      grain: 0.12,
      vignette: 0.55,
    },
  },
]

export function getPreset(id: SolarPresetId | string | null | undefined) {
  return presets.find((p) => p.id === id) ?? presets[0]
}
