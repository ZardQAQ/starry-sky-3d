<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { StarParams } from '@/presets/starPresets'
import { createStarStage, type StarStage } from '@/three/createStarStage'

const props = defineProps<{
  params: StarParams
}>()

const emit = defineEmits<{
  (e: 'ready', api: { capture: () => Promise<Blob> }): void
}>()

const host = ref<HTMLDivElement | null>(null)
const webglOk = ref(true)
let stage: StarStage | null = null

onMounted(() => {
  if (!host.value) return
  try {
    stage = createStarStage(host.value, props.params)
    emit('ready', {
      capture: () => stage!.capturePngBlob(),
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
  <div v-if="webglOk" ref="host" class="absolute inset-0" />
  <div v-else class="absolute inset-0">
    <div class="fallback-stars absolute inset-0" />
    <div class="absolute inset-0 grid place-items-center px-6">
      <div class="max-w-[520px] rounded-2xl border border-white/10 bg-black/55 p-5 text-center text-sm text-white/75 backdrop-blur">
        当前预览环境禁用 WebGL，无法显示 three.js 渲染结果。
        <div class="mt-2 text-[11px] leading-relaxed text-white/55">
          在真实浏览器或本地运行时将展示完整的 3D 星空与后期特效。
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fallback-stars {
  background:
    radial-gradient(circle at 22% 30%, rgba(255, 255, 255, 0.12) 0 1px, transparent 2px),
    radial-gradient(circle at 72% 24%, rgba(255, 255, 255, 0.12) 0 1px, transparent 2px),
    radial-gradient(circle at 55% 68%, rgba(255, 255, 255, 0.11) 0 1px, transparent 2px),
    radial-gradient(circle at 30% 74%, rgba(255, 255, 255, 0.1) 0 1px, transparent 2px),
    radial-gradient(circle at 80% 78%, rgba(255, 255, 255, 0.08) 0 1px, transparent 2px),
    radial-gradient(80% 70% at 50% 30%, rgba(120, 210, 255, 0.14), transparent 60%),
    radial-gradient(70% 60% at 70% 70%, rgba(255, 75, 242, 0.08), transparent 55%),
    radial-gradient(60% 60% at 30% 75%, rgba(255, 90, 60, 0.05), transparent 55%),
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
