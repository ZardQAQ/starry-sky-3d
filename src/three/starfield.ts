import * as THREE from 'three'
import { mulberry32 } from '@/three/rand'

export function makeStarGeometry(seed: number, count: number, radius: number) {
  const rand = mulberry32(seed)
  const positions = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  const tw = new Float32Array(count)
  const hue = new Float32Array(count)

  for (let i = 0; i < count; i += 1) {
    const u = rand()
    const v = rand()
    const theta = u * Math.PI * 2
    const phi = Math.acos(2 * v - 1)
    const rr = radius * Math.pow(rand(), 0.6)
    positions[i * 3 + 0] = rr * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = rr * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = rr * Math.cos(phi)
    scales[i] = 0.6 + Math.pow(rand(), 2) * 2.8
    tw[i] = rand()
    hue[i] = rand()
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geom.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
  geom.setAttribute('aTwinkle', new THREE.BufferAttribute(tw, 1))
  geom.setAttribute('aHue', new THREE.BufferAttribute(hue, 1))
  geom.computeBoundingSphere()
  return geom
}

export type StarUniforms = {
  uTime: { value: number }
  uSize: { value: number }
  uTwinkle: { value: number }
  uWarp: { value: number }
  uHueShift: { value: number }
  uColorA: { value: THREE.Color }
  uColorB: { value: THREE.Color }
}

export function createStarMaterial(initial: {
  twinkle: number
  warp: number
  hueShift: number
  colorA?: string
  colorB?: string
}) {
  const uniforms: StarUniforms = {
    uTime: { value: 0 },
    uSize: { value: 1 },
    uTwinkle: { value: initial.twinkle },
    uWarp: { value: initial.warp },
    uHueShift: { value: initial.hueShift },
    uColorA: { value: new THREE.Color(initial.colorA ?? '#8bd0ff') },
    uColorB: { value: new THREE.Color(initial.colorB ?? '#ff4ff2') },
  }

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: `
      attribute float aScale;
      attribute float aTwinkle;
      attribute float aHue;

      uniform float uTime;
      uniform float uSize;
      uniform float uTwinkle;
      uniform float uWarp;
      uniform float uHueShift;

      varying float vTw;
      varying float vHue;

      void main() {
        vec3 p = position;
        float t = uTime * (0.35 + aTwinkle * 0.9);
        float w = sin(t + aHue * 12.0) * 0.5 + 0.5;
        float pulse = mix(0.35, 1.0, w) * uTwinkle;
        p += normalize(p) * (sin(uTime * 0.18 + aHue * 14.0) * 0.65) * uWarp;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = (aScale * 6.0 + 2.0) * uSize * (1.0 + pulse * 0.55);
        gl_PointSize = size * (180.0 / -mv.z);
        vTw = pulse;
        vHue = fract(aHue + uHueShift);
      }
    `,
    fragmentShader: `
      uniform vec3 uColorA;
      uniform vec3 uColorB;

      varying float vTw;
      varying float vHue;

      vec3 hueShift(vec3 c, float h) {
        float angle = h * 6.2831853;
        float s = sin(angle);
        float co = cos(angle);
        mat3 m = mat3(
          0.299 + 0.701 * co + 0.168 * s, 0.587 - 0.587 * co + 0.330 * s, 0.114 - 0.114 * co - 0.497 * s,
          0.299 - 0.299 * co - 0.328 * s, 0.587 + 0.413 * co + 0.035 * s, 0.114 - 0.114 * co + 0.292 * s,
          0.299 - 0.300 * co + 1.250 * s, 0.587 - 0.588 * co - 1.050 * s, 0.114 + 0.886 * co - 0.203 * s
        );
        return clamp(m * c, 0.0, 1.0);
      }

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float core = smoothstep(0.5, 0.0, d);
        float halo = smoothstep(0.6, 0.12, d) * 0.55;
        float a = clamp(core + halo, 0.0, 1.0);
        vec3 base = mix(uColorA, uColorB, vHue);
        base = hueShift(base, (vHue - 0.5) * 0.28);
        vec3 c = base * (0.22 + vTw * 0.55);
        gl_FragColor = vec4(c, a * 0.78);
      }
    `,
  })

  return { material, uniforms }
}
