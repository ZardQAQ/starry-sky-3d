export function isWebglAvailable() {
  const canvas = document.createElement('canvas')
  const gl =
    canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
    canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true }) ||
    canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: true })
  return !!gl
}

