import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

export function makeVignettePass() {
  const shader = {
    uniforms: {
      tDiffuse: { value: null },
      uStrength: { value: 0.6 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uStrength;
      varying vec2 vUv;

      float vignet(vec2 uv) {
        vec2 p = uv - 0.5;
        float d = dot(p, p);
        return smoothstep(0.52, 0.06, d);
      }

      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        float v = vignet(vUv);
        c.rgb *= mix(1.0 - uStrength, 1.0, v);
        gl_FragColor = c;
      }
    `,
  }

  return new ShaderPass(shader as any)
}

