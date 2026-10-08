<script setup lang="ts">
import { Pane } from 'tweakpane'
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import SolarStage from '@/components/SolarStage.vue'
import { getPreset, presets, type SolarParams, type SolarPresetId } from '@/presets/solarPresets'
import { readParamsFromUrl, writeParamsToUrl } from '@/presets/solarUrlState'
import type { SolarPlanetId } from '@/three/createSolarSystemStage'

const router = useRouter()
const stageApi = ref<{
  capture: () => Promise<Blob>
  focus: (id: SolarPlanetId) => void
  lock: (id: SolarPlanetId) => void
  unlock: () => void
  reset: () => void
} | null>(null)
const onStageReady = (api: { capture: () => Promise<Blob> }) => {
  stageApi.value = api as any
}

const url = new URL(window.location.href)
const startPreset = (presets.find((p) => p.id === url.searchParams.get('preset'))?.id ?? 'hyper') as SolarPresetId

const presetId = ref<SolarPresetId>(startPreset)
const params = reactive<SolarParams>(readParamsFromUrl(getPreset(presetId.value).params))

const paneHost = ref<HTMLDivElement | null>(null)
let pane: any = null

const syncUrl = () => {
  const next = new URL(window.location.href)
  next.searchParams.set('preset', presetId.value)
  window.history.replaceState(null, '', next.toString())
  writeParamsToUrl(params)
}

const setPreset = (id: SolarPresetId) => {
  presetId.value = id
  Object.assign(params, readParamsFromUrl(getPreset(id).params))
  syncUrl()
}

const randomizeSeed = () => {
  params.seed = Math.floor(1 + Math.random() * 999)
  syncUrl()
}

const copyLink = async () => {
  const text = window.location.href
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

const downloadShot = async () => {
  if (!stageApi.value) return
  const blob = await stageApi.value.capture()
  const u = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = u
  a.download = `solarsys_lab_${Date.now()}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(u)
}

const locked = ref<SolarPlanetId | null>(null)

const lockPlanet = (id: SolarPlanetId) => {
  locked.value = id
  stageApi.value?.lock(id)
}

const unlockPlanet = () => {
  locked.value = null
  stageApi.value?.unlock()
}

const resetView = () => {
  locked.value = null
  stageApi.value?.reset()
}

onMounted(() => {
  document.documentElement.classList.add('dark')
  if (!paneHost.value) return

  pane = new Pane({ container: paneHost.value }) as any
  pane.addBinding(params, 'timeScale', { min: 0.05, max: 6, step: 0.01, label: '时间倍率' })
  pane.addBinding(params, 'orbitScale', { min: 0.5, max: 1.8, step: 0.01, label: '轨道尺度' })
  pane.addBinding(params, 'planetScale', { min: 0.6, max: 2.2, step: 0.01, label: '行星尺度' })
  pane.addBinding(params, 'showOrbits', { label: '显示轨道' })
  pane.addBinding(params, 'showLabels', { label: '显示标签' })
  pane.addBinding(params, 'bloomStrength', { min: 0, max: 2.2, step: 0.01, label: 'Bloom' })
  pane.addBinding(params, 'bloomThreshold', { min: 0, max: 0.9, step: 0.01, label: '阈值' })
  pane.addBinding(params, 'afterimage', { min: 0, max: 0.96, step: 0.001, label: '拖尾' })
  pane.addBinding(params, 'grain', { min: 0, max: 0.8, step: 0.01, label: '颗粒' })
  pane.addBinding(params, 'vignette', { min: 0, max: 1, step: 0.01, label: '暗角' })
  pane.addBinding(params, 'seed', { min: 1, max: 999, step: 1, label: '种子' })

  pane.on('change', syncUrl)
})

onBeforeUnmount(() => {
  pane?.dispose()
  pane = null
})
</script>

<template>
  <main class="relative min-h-dvh overflow-hidden bg-black text-white">
    <SolarStage :params="params" @ready="(api) => (stageApi = api)" />
    <div class="noise pointer-events-none absolute inset-0 opacity-[0.26]" />

    <div class="pointer-events-none relative z-10 mx-auto flex min-h-dvh max-w-[1180px] flex-col gap-5 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] lg:flex-row lg:gap-6 lg:px-6 lg:py-8">
      <div class="flex flex-1 flex-col justify-between gap-8 lg:gap-0">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="text-xs tracking-[0.22em] text-white/55">LAB MODE</div>
            <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">参数实验室</h1>
            <p class="mt-2 max-w-[62ch] text-sm leading-relaxed text-white/65">
              这里控制“时间”和“镜头体验”。修改会实时写入 URL，复制链接即可分享同一套太阳系参数。
            </p>
          </div>
          <div class="pointer-events-auto flex w-full items-center gap-2 sm:w-auto">
            <button class="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white/80 backdrop-blur transition hover:bg-white/10 active:bg-white/15 sm:flex-none sm:py-2" @click="downloadShot">
              截图
            </button>
            <button class="flex-1 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90 active:bg-white/80 sm:flex-none sm:py-2" @click="router.push('/')">
              返回舞台
            </button>
          </div>
        </div>

        <div class="pointer-events-auto flex flex-col gap-3 pb-2 text-[11px] text-white/55 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span class="opacity-70">预设：</span>
            <button class="rounded-full px-3 py-2 transition hover:bg-white/5 active:bg-white/10" @click="setPreset('hyper')">夸张炫酷</button>
            <button class="rounded-full px-3 py-2 transition hover:bg-white/5 active:bg-white/10" @click="setPreset('cinema')">电影质感</button>
            <button class="rounded-full px-3 py-2 transition hover:bg-white/5 active:bg-white/10" @click="setPreset('clean')">清爽观察</button>
            <span class="hidden opacity-30 sm:inline">/</span>
            <button class="rounded-full px-3 py-2 transition hover:bg-white/5 active:bg-white/10" @click="randomizeSeed">随机种子</button>
          </div>
          <div class="flex items-center gap-2">
            <button class="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/80 backdrop-blur transition hover:bg-white/10 active:bg-white/15 sm:flex-none" @click="copyLink">
              复制分享链接
            </button>
            <button class="rounded-full px-3 py-2 transition hover:bg-white/5 active:bg-white/10" @click="router.push('/info')">说明</button>
          </div>
        </div>
      </div>

      <aside class="pointer-events-auto w-full shrink-0 lg:w-[320px]">
        <div class="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
          <div class="mb-3 flex items-end justify-between">
            <div>
              <div class="text-[11px] tracking-[0.22em] text-white/55">TWEAKPANE</div>
              <div class="text-sm font-semibold text-white/85">实时调参</div>
            </div>
            <div class="text-[11px] text-white/45">{{ presetId }}</div>
          </div>
          <div ref="paneHost" class="tp" />
          <div class="mt-4">
            <div class="mb-2 flex items-center justify-between">
              <div class="text-[11px] tracking-[0.22em] text-white/55">FOCUS</div>
              <button
                v-if="locked"
                class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/10"
                @click="unlockPlanet"
              >
                解除锁定
              </button>
            </div>
            <div class="grid grid-cols-2 gap-2 text-[11px] text-white/70">
              <button class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10" @click="lockPlanet('mercury')">水星</button>
              <button class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10" @click="lockPlanet('venus')">金星</button>
              <button class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10" @click="lockPlanet('earth')">地球</button>
              <button class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10" @click="lockPlanet('mars')">火星</button>
              <button class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10" @click="lockPlanet('jupiter')">木星</button>
              <button class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10" @click="lockPlanet('saturn')">土星</button>
              <button class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10" @click="lockPlanet('uranus')">天王星</button>
              <button class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10" @click="lockPlanet('neptune')">海王星</button>
            </div>
            <button class="mt-2 w-full rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-black transition hover:bg-white/90" @click="resetView">
              重置视角
            </button>
          </div>
          <div class="mt-3 text-[11px] leading-relaxed text-white/45">
            提示：如果你感觉太“乱”，降低时间倍率与 Bloom；想更炸就提高 Bloom 并把拖尾拉高。
          </div>
        </div>
      </aside>
    </div>
  </main>
</template>
