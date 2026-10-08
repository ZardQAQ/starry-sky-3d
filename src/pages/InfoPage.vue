<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import SolarStage from '@/components/SolarStage.vue'
import { getPreset, type SolarParams } from '@/presets/solarPresets'

const router = useRouter()
const stageApi = ref<{ capture: () => Promise<Blob> } | null>(null)
const onStageReady = (api: { capture: () => Promise<Blob> }) => {
  stageApi.value = api
}

const params = reactive<SolarParams>({ ...getPreset('cinema').params })
params.timeScale = 0.85
params.showOrbits = true
params.showLabels = true
params.bloomStrength = 0.9
params.afterimage = 0.72
params.grain = 0.16
params.vignette = 0.7

const tips = computed(() => [
  { k: '左键拖拽', v: '360° 旋转视角', mobile: false },
  { k: '滚轮', v: '缩放镜头', mobile: false },
  { k: '右键拖拽', v: '平移（可选）', mobile: false },
  { k: '单指拖拽', v: '旋转视角', mobile: true },
  { k: '双指捏合', v: '缩放镜头', mobile: true },
  { k: '1/2/3', v: '切换风格预设', mobile: false },
  { k: 'L', v: '进入实验室', mobile: false },
])

const visibleTips = computed(() => {
  const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches
  if (mobile) {
    return tips.value.filter((t) => t.mobile)
  }
  return tips.value.filter((t) => !t.mobile)
})
</script>

<template>
  <main class="relative min-h-dvh overflow-hidden bg-black text-white">
    <SolarStage :params="params" @ready="onStageReady" />
    <div class="noise pointer-events-none absolute inset-0 opacity-[0.22]" />

    <section class="pointer-events-none relative z-10 mx-auto max-w-[980px] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6 sm:py-10">
      <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <div class="text-xs tracking-[0.22em] text-white/55">INFO</div>
          <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">控制与说明</h1>
          <p class="mt-3 max-w-[70ch] text-sm leading-relaxed text-white/65">
            这里是太阳系 3D 交互：OrbitControls 负责旋转与缩放；行星做公转与自转；太阳通过 Bloom 强化辉光。移动端支持单指旋转、双指捏合缩放。
          </p>
        </div>
        <div class="pointer-events-auto flex w-full items-center gap-2 sm:w-auto">
          <button class="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white/80 backdrop-blur transition hover:bg-white/10 active:bg-white/15 sm:flex-none sm:py-2" @click="router.push('/lab')">
            去实验室
          </button>
          <button class="flex-1 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90 active:bg-white/80 sm:flex-none sm:py-2" @click="router.push('/')">
            返回舞台
          </button>
        </div>
      </div>

      <div class="mt-6 grid gap-4 sm:mt-8 md:grid-cols-2">
        <div class="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur sm:p-6">
          <div class="text-[11px] tracking-[0.22em] text-white/55">CONTROLS</div>
          <div class="mt-3 space-y-2">
            <div v-for="t in visibleTips" :key="t.k" class="flex items-baseline justify-between gap-4 sm:gap-6">
              <div class="text-xs font-semibold text-white/85">{{ t.k }}</div>
              <div class="text-right text-xs text-white/60">{{ t.v }}</div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur">
          <div class="text-[11px] tracking-[0.22em] text-white/55">TECH</div>
          <div class="mt-3 space-y-2 text-xs text-white/65">
            <div class="flex justify-between gap-6"><span class="text-white/55">框架</span><span>Vue 3 + Vite + Tailwind</span></div>
            <div class="flex justify-between gap-6"><span class="text-white/55">渲染</span><span>three.js（原生渲染循环）</span></div>
            <div class="flex justify-between gap-6"><span class="text-white/55">控制</span><span>OrbitControls（旋转/缩放/阻尼）</span></div>
            <div class="flex justify-between gap-6"><span class="text-white/55">后期</span><span>EffectComposer + Bloom + Film + Vignette + Afterimage</span></div>
            <div class="flex justify-between gap-6"><span class="text-white/55">调参</span><span>Tweakpane（实验室）</span></div>
          </div>
          <div class="mt-4 text-[11px] leading-relaxed text-white/45">
            资源与字体尽量走自生成/自带方案；如后续需要可替换为授权字体与品牌资产。
          </div>
        </div>
      </div>

      <div class="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur">
        <div class="text-[11px] tracking-[0.22em] text-white/55">CREDITS</div>
        <div class="mt-3 text-xs leading-relaxed text-white/60">
          目前行星纹理由程序化生成；若之后引入真实行星贴图，会在这里补充来源与授权信息。
        </div>
      </div>
    </section>
  </main>
</template>
