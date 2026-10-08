<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { SolarParams } from '@/presets/solarPresets'
import { createSolarSystemStage, type SolarStageApi, type SolarPlanetId } from '@/three/createSolarSystemStage'

const props = defineProps<{
  params: SolarParams
}>()

const emit = defineEmits<{
  (
    e: 'ready',
    api: {
      capture: () => Promise<Blob>
      focus: (id: SolarPlanetId) => void
      lock: (id: SolarPlanetId) => void
      unlock: () => void
      reset: () => void
    },
  ): void
}>()

const host = ref<HTMLDivElement | null>(null)
const webglOk = ref(true)
let stage: SolarStageApi | null = null

onMounted(() => {
  if (!host.value) return
  try {
    stage = createSolarSystemStage(host.value, props.params)
    emit('ready', {
      capture: () => stage!.capturePngBlob(),
      focus: (id) => stage!.focusPlanet(id),
      lock: (id) => stage!.lockPlanet(id),
      unlock: () => stage!.unlockPlanet(),
      reset: () => stage!.resetView(),
    })
  } catch {
    webglOk.value = false
  }
})

watch(
  () => props.params,
  (p) => stage?.setParams(p),
  { deep: true },
)

onBeforeUnmount(() => stage?.dispose())
</script>

<template>
  <div v-if="webglOk" ref="host" class="absolute inset-0 touch-none" />
  <div v-else class="absolute inset-0">
    <div class="fallback-stars absolute inset-0" />
    <div class="absolute inset-0 grid place-items-center px-6">
      <div class="max-w-[540px] rounded-2xl border border-white/10 bg-black/55 p-5 text-center text-sm text-white/75 backdrop-blur">
        当前环境禁用 WebGL，无法预览太阳系 3D 渲染结果。
        <div class="mt-2 text-[11px] leading-relaxed text-white/55">
          在你的本地浏览器运行时，可使用鼠标或触摸手势旋转与缩放视角。
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.fallback-stars {
  background:
    radial-gradient(circle at 22% 30%, rgba(255, 255, 255, 0.12) 0 1px, transparent 2px),
    radial-gradient(circle at 72% 24%, rgba(255, 255, 255, 0.12) 0 1px, transparent 2px),
    radial-gradient(circle at 55% 68%, rgba(255, 255, 255, 0.11) 0 1px, transparent 2px),
    radial-gradient(circle at 30% 74%, rgba(255, 255, 255, 0.1) 0 1px, transparent 2px),
    radial-gradient(circle at 80% 78%, rgba(255, 255, 255, 0.08) 0 1px, transparent 2px),
    radial-gradient(70% 55% at 50% 38%, rgba(255, 180, 75, 0.22), transparent 58%),
    radial-gradient(70% 60% at 70% 70%, rgba(80, 140, 255, 0.09), transparent 55%),
    radial-gradient(60% 60% at 30% 75%, rgba(255, 90, 60, 0.06), transparent 55%),
    #000;
  background-size: 480px 480px, 540px 540px, 620px 620px, 740px 740px, 860px 860px, auto, auto, auto, auto;
  animation: drift 12s linear infinite;
}

@keyframes drift {
  from {
    transform: translate3d(0, 0, 0) scale(1.02);
  }
  to {
    transform: translate3d(-22px, -14px, 0) scale(1.02);
  }
}
</style>
