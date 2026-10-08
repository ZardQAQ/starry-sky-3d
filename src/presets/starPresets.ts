export type StarPresetId = 'serenity' | 'neon' | 'redshift'

export type StarParams = {
  seed: number
  density: number
  radius: number
  drift: number
  warp: number
  twinkle: number
  nebula: number
  meteorRate: number
  bloomStrength: number
  bloomRadius: number
  bloomThreshold: number
  trail: number
  vignette: number
  grain: number
  hueShift: number
}

export type StarPreset = {
  id: StarPresetId
  name: string
  tagline: string
  params: StarParams
}

export const defaultParams: StarParams = {
  seed: 73,
  density: 1,
  radius: 260,
  drift: 0.22,
  warp: 0.42,
  twinkle: 0.75,
  nebula: 0.7,
  meteorRate: 0.32,
  bloomStrength: 0.9,
  bloomRadius: 0.55,
  bloomThreshold: 0.22,
  trail: 0.62,
  vignette: 0.6,
  grain: 0.24,
  hueShift: 0,
}

export const presets: StarPreset[] = [
  {
    id: 'serenity',
    name: '静谧',
    tagline: '低噪声 · 远星 · 轻辉光',
    params: {
      ...defaultParams,
      seed: 41,
      density: 0.86,
      drift: 0.16,
      warp: 0.34,
      twinkle: 0.55,
      nebula: 0.55,
      meteorRate: 0.18,
      bloomStrength: 0.72,
      bloomRadius: 0.45,
      bloomThreshold: 0.26,
      trail: 0.54,
      vignette: 0.65,
      grain: 0.22,
      hueShift: -0.06,
    },
  },
  {
    id: 'neon',
    name: '霓虹',
    tagline: '高对比 · 电光 · 颗粒胶片',
    params: {
      ...defaultParams,
      seed: 73,
      density: 1.05,
      drift: 0.26,
      warp: 0.55,
      twinkle: 0.85,
      nebula: 0.85,
      meteorRate: 0.34,
      bloomStrength: 0.98,
      bloomRadius: 0.62,
      bloomThreshold: 0.18,
      trail: 0.66,
      vignette: 0.55,
      grain: 0.3,
      hueShift: 0.12,
    },
  },
  {
    id: 'redshift',
    name: '红移',
    tagline: '压迫感 · 燃烧 · 末日回声',
    params: {
      ...defaultParams,
      seed: 19,
      density: 0.98,
      drift: 0.3,
      warp: 0.7,
      twinkle: 0.92,
      nebula: 0.75,
      meteorRate: 0.42,
      bloomStrength: 0.92,
      bloomRadius: 0.72,
      bloomThreshold: 0.16,
      trail: 0.7,
      vignette: 0.72,
      grain: 0.34,
      hueShift: 0.66,
    },
  },
]

export function getPreset(id: StarPresetId | string | null | undefined) {
  return presets.find((p) => p.id === id) ?? presets[1]
}
