<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import SolarStage from '@/components/SolarStage.vue'
import { getPreset, presets, type SolarParams, type SolarPresetId } from '@/presets/solarPresets'
import { readParamsFromUrl, writeParamsToUrl } from '@/presets/solarUrlState'
import type { SolarPlanetId } from '@/three/createSolarSystemStage'

const router = useRouter()

const initialPreset = (() => {
  const url = new URL(window.location.href)
  const fromUrl = url.searchParams.get('preset')
  return (presets.find((p) => p.id === fromUrl)?.id ?? 'hyper') as SolarPresetId
})()

const presetId = ref<SolarPresetId>(initialPreset)
const preset = computed(() => getPreset(presetId.value))

const params = reactive<SolarParams>(readParamsFromUrl(preset.value.params))

const stageApi = ref<{
  capture: () => Promise<Blob>
  focus: (id: SolarPlanetId) => void
  lock: (id: SolarPlanetId) => void
  unlock: () => void
  reset: () => void
} | null>(null)

const onStageReady = (api: {
  capture: () => Promise<Blob>
  focus: (id: SolarPlanetId) => void
  lock: (id: SolarPlanetId) => void
  unlock: () => void
  reset: () => void
}) => {
  stageApi.value = api
}

const setPreset = (id: SolarPresetId) => {
  presetId.value = id
  Object.assign(params, readParamsFromUrl(getPreset(id).params))
  const url = new URL(window.location.href)
  url.searchParams.set('preset', id)
  window.history.replaceState(null, '', url.toString())
  writeParamsToUrl(params)
}

const downloadShot = async () => {
  if (!stageApi.value) return
  const blob = await stageApi.value.capture()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `solarsys_${presetId.value}_${Date.now()}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const goLab = () => router.push('/lab')
const goInfo = () => router.push('/info')

const onKey = (e: KeyboardEvent) => {
  if (e.key === '1') setPreset('hyper')
  if (e.key === '2') setPreset('cinema')
  if (e.key === '3') setPreset('clean')
  if (e.key.toLowerCase() === 'l') goLab()
  if (e.key.toLowerCase() === 'i') goInfo()
}

onMounted(() => {
  document.documentElement.classList.add('dark')
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <main class="relative min-h-dvh overflow-hidden bg-black text-white">
    <SolarStage :params="params" @ready="onStageReady" />

    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_30%,rgba(120,210,255,0.16),transparent_60%),radial-gradient(70%_60%_at_70%_70%,rgba(255,75,242,0.10),transparent_55%),radial-gradient(60%_60%_at_30%_75%,rgba(255,90,60,0.06),transparent_55%)]" />
    <div class="noise pointer-events-none absolute inset-0 opacity-[0.28]" />

    <section class="pointer-events-none relative z-10 mx-auto flex min-h-dvh max-w-[1180px] flex-col justify-between px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:py-8">
      <header class="flex flex-col items-center gap-5 text-center sm:items-start sm:text-left sm:gap-6 md:flex-row md:justify-between">
        <div class="max-w-[720px]">
          <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] tracking-[0.22em] text-white/70">
            <span class="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.9)]" />
            <span>SOLAR SYSTEM // LIVE</span>
          </div>
          <h1 class="mt-4 text-balance text-[34px] font-semibold leading-[0.98] tracking-[-0.04em] sm:mt-5 sm:text-[44px] md:text-[72px]">
            太阳在燃烧
            <span class="block text-white/60">你在轨道上转动</span>
          </h1>
          <p class="mx-auto mt-4 max-w-[56ch] text-pretty text-sm leading-relaxed text-white/72 sm:mx-0 sm:mt-5 md:text-base">
            <span class="hidden sm:inline">鼠标拖拽 360° 旋转视角，滚轮缩放。按 1/2/3 切换风格，L 进入实验室，I 查看说明。</span>
            <span class="sm:hidden">单指拖拽旋转视角，双指捏合缩放。点击下方按钮切换风格或进入实验室。</span>
          </p>
        </div>

        <div class="pointer-events-auto flex w-full max-w-sm items-center justify-center gap-2 sm:w-auto sm:max-w-none sm:justify-start">
          <button
            class="group inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-white/80 backdrop-blur transition hover:border-white/20 hover:bg-white/10 sm:flex-none sm:py-2"
            @click="downloadShot"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-white/70 shadow-[0_0_18px_rgba(255,255,255,0.4)] transition group-hover:bg-white" />
            截图
          </button>
          <button
            class="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90 sm:flex-none sm:py-2"
            @click="goLab"
          >
            进入实验室
          </button>
        </div>
      </header>

      <footer class="pointer-events-auto mt-8 flex flex-col items-center gap-4 pb-2 text-center sm:mt-0 sm:items-stretch sm:gap-5 sm:text-left">
        <div class="flex w-full flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 shrink-0 rounded-2xl border border-white/10 bg-white/5 backdrop-blur" />
            <div>
              <div class="text-xs font-semibold tracking-wide">{{ preset.name }}</div>
              <div class="text-[11px] tracking-[0.18em] text-white/55">{{ preset.tagline }}</div>
            </div>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-white/60 sm:justify-end sm:gap-2">
            <button class="rounded-full px-3 py-2 transition hover:bg-white/5 active:bg-white/10" @click="goInfo">说明</button>
            <span class="hidden opacity-30 sm:inline">/</span>
            <button class="rounded-full px-3 py-2 transition hover:bg-white/5 active:bg-white/10" @click="setPreset('hyper')">1 夸张</button>
            <button class="rounded-full px-3 py-2 transition hover:bg-white/5 active:bg-white/10" @click="setPreset('cinema')">2 电影</button>
            <button class="rounded-full px-3 py-2 transition hover:bg-white/5 active:bg-white/10" @click="setPreset('clean')">3 清爽</button>
          </div>
        </div>

        <div class="flex w-full flex-col items-center gap-1 text-[11px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span class="hidden sm:inline">交互：拖拽旋转 / 滚轮缩放 / 1-3 风格</span>
            <span class="sm:hidden">交互：单指旋转 / 双指缩放 / 下方切换风格</span>
          </div>
          <div class="hidden md:block">提示：进入实验室可调整时间倍率、轨道与标签，并一键聚焦行星</div>
        </div>
      </footer>
    </section>
  </main>
</template>
