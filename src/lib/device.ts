export function isCoarsePointer() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches
}

export function isNarrowViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 767px)').matches
}

export function isMobileExperience() {
  return isCoarsePointer() || isNarrowViewport()
}

export function getRenderPixelRatio() {
  const dpr = window.devicePixelRatio || 1
  if (isMobileExperience()) return Math.min(dpr, 1.5)
  return Math.min(dpr, 2)
}
