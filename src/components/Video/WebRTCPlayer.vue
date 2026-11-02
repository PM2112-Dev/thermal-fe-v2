<template>
  <div class="rounded overflow-hidden shadow-lg bg-white p-2">
    <div v-if="cam" class="flex flex-wrap gap-2 m-0">
      <div v-show="cam?.name" class="truncate text-xs">
        {{ cam?.name }}
      </div>
      <div v-show="cam?.area" class="truncate text-xs">
        <span class="font-bold">{{ t('video.area') }}: </span>{{ cam?.area?.name }}
      </div>
    </div>

    <!-- Video wrapper -->
    <div
        v-loading="loading"
        class="relative aspect-video border rounded bg-black overflow-hidden group"
    >
      <div
          ref="videoRef"
          :class="['h-[-webkit-fill-available] relative', isFullscreen? 'flex justify-center items-center': '']"
      >
        <!-- Controls -->
        <div
            class="absolute bottom-2 right-2 z-20 px-3 py-2 rounded-lg flex gap-2 shadow-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <el-button
              size="small"
              circle
              type="primary"
              @click="togglePlayback"
              :icon="isPlaying ? VideoPause : VideoPlay"
          />
          <el-button size="small" circle type="success" @click="screenshot" :icon="Camera"/>
          <el-button size="small" circle type="info" @click="toggleFullScreen" :icon="FullScreen"/>
        </div>
        <div v-if="isFullscreen">
          <div
              class="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20 px-3 py-2 rounded-lg flex gap-2 shadow-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <el-button
                size="small"
                circle type="success"
                @click="visibleControl = !visibleControl"
                :icon="Coordinate"
                :title="t('video.adjustCamera')"
            />
            <ControlButtonCamera v-show="visibleControl" v-if="cam" :form-model="cam"/>
          </div>
        </div>
        <div
            v-if="isFullscreen"
            class="flex items-center gap-2 absolute bottom-2 left-2 z-20 px-3 py-2 shadow-lg backdrop-blur-sm"
        >
          <el-button
              v-if="isDrawing === false"
              size="small"
              circle
              type="warning"
              :icon="Aim"
              @click="startDrawing"
              :title="t('video.startMeasure')"
          >
          </el-button>
          <el-button
              v-if="isDrawing && pointCount >= 1"
              size="small"
              type="danger"
              circle
              :icon="Odometer"
              :loading="measureTempLoading"
              @click="measureTemp"
              :title="t('video.measureTemperature')"
          >
          </el-button>
          <el-button
              v-if="isDrawing && pointCount"
              color="#495480"
              size="small"
              circle
              :icon="CloseBold"
              @click="stopDrawing"
              :title="t('video.stopMeasure')"
          >
          </el-button>
          <span class="text-white text-2xl">{{drawResultText}}</span>
        </div>
        <!-- Canvas overlay -->
        <canvas
            ref="canvasRef"
            class="absolute z-1 pointer-events-auto"
            v-show="isDrawing"
        ></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLang } from '@/hooks/web/useI18n'
import {ref, onMounted, nextTick, onUnmounted} from 'vue'
import {
  VideoPlay,
  VideoPause,
  Camera,
  FullScreen,
  Aim,
  Odometer,
  CloseBold, Coordinate,
} from '@element-plus/icons-vue'
import { prepareCameraStream } from '@/plugins/webRTC/cameraStream'
import {PolygonDrawer} from '@/utils/PolygonDrawer'
import useRequest from '@/hooks/web/useRequest'
import {thermalDataByAreaApi} from '@/api/thermal-data'
import ControlButtonCamera from "@/components/Button/ControlButtonCamera.vue";

const { t } = useLang()

const props = defineProps({
  streamKey: {type: [String, Number], required: true},
  cam: {type: [Object], required: false},
})
// Báo kích thước gốc của luồng để lớp vẽ (SVG) dùng đúng hệ toạ độ
const emit = defineEmits<{ (e: 'video-size', size: { width: number; height: number }): void }>()

const videoRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const videoLoading = ref(true)
const videoStream = document.createElement('video-stream') as any
videoStream.addEventListener('stream-onopen', () => {
  videoLoading.value = false
  nextTick(() => {
    pictureScreenMode()
  })
})
videoStream.addEventListener('stream-error', () => {
  videoLoading.value = false
})
const isPlaying = ref(false)
const loading = ref(false)
const isDrawing = ref(false)
const isFullscreen = ref(false)
const visibleControl = ref(false)
const pointCount = ref(0)

let drawer: PolygonDrawer | null = null

onMounted(() => {
  loading.value = true
  prepareCameraStream(videoStream, props.streamKey)
      .then(() => {
        videoRef?.value?.appendChild(videoStream)

        const video = videoStream.video
        video.addEventListener('waiting', () => {
          isPlaying.value = false
        })
        video.addEventListener('playing', () => {
          isPlaying.value = true
        })
        video.addEventListener('pause', () => {
          isPlaying.value = false
        })
        const reportSize = () => {
          if (video.videoWidth && video.videoHeight) emit('video-size', {width: video.videoWidth, height: video.videoHeight})
        }
        video.addEventListener('loadedmetadata', reportSize)
        video.addEventListener('resize', reportSize)

        document.addEventListener('fullscreenchange', () => {
          isFullscreen.value = !!document.fullscreenElement
          const videoEl = videoRef.value?.querySelector('video')
          if (videoEl) {
            if (isFullscreen.value) {
              fullScreenMode()
            } else {
              pictureScreenMode()
              isDrawing.value = false
              drawer?.stop()
            }
            drawer?.removeAllPoint();
            stopDrawing();
          }
        })
      })
      .finally(() => {
        loading.value = false
      })
  pictureScreenMode()
})

const pictureScreenMode = () => {
  const videoEl = videoRef.value?.querySelector('video')
  if (videoEl) {
    videoEl.style.objectFit = 'fill'
    videoEl.style.width = '100%'
    videoEl.style.height = '100%'
  }
}

const fullScreenMode = () => {
  const videoEl = videoRef.value?.querySelector('video')
  if (videoEl) {
    videoEl.style.objectFit = 'contain'
    videoEl.style.width = 'unset'
    videoEl.style.height = 'unset'
  }
}

function togglePlayback() {
  if (isPlaying.value) {
    pause()
  } else {
    play()
  }
}

function play() {
  videoStream.play()
}

function pause() {
  videoStream.pause()
}

function screenshot() {
  videoStream.saveScreenshot()
}

function toggleFullScreen() {
  const video = videoRef.value
  const doc = document as any
  if (!document.fullscreenElement) video?.requestFullscreen?.()
  else {
    doc.exitFullscreen?.();
    stopDrawing()
  }
}

const pointValues = ref<any>([])
const videoWidth = ref(0)
const videoHeight = ref(0)

function startDrawing() {
  isDrawing.value = true
  nextTick(() => {
    const c = canvasRef.value
    const v = videoRef.value?.querySelector('video') as HTMLVideoElement
    if (c && v) {
      c.width = v.videoWidth
      c.height = v.videoHeight

      videoWidth.value = v.clientWidth
      videoHeight.value = v.clientHeight

      if (!drawer) {
        drawer = new PolygonDrawer(
            c,
            (_points) => {
              isDrawing.value = false
            },
            (points) => {
              pointCount.value = points.length
              pointValues.value = points
              nextTick(() => {
                if (pointCount.value >= 3 && !drawer?.isConvex()) {
                  drawer?.showFullScreenAlert(videoRef, t('video.notConvex'));
                  drawer?.clearLastPoint()
                }
              })
            },
        )
      }

      drawer.removeAllPoint() // always start fresh
      drawer.start()
    }
  })
}

const {onRequest: measureTempRequest, isLoading: measureTempLoading} = useRequest()

const timerId = ref(0);
const drawResultText = ref("");

const stopDrawing = () => {
  drawer?.removeAllPoint();
  drawResultText.value = "";
  isDrawing.value = false;
  if(timerId.value) {
    clearInterval(timerId.value);
  }
}

onUnmounted(() => {
  if (timerId.value) {
    clearInterval(timerId.value);
  }
});
function measureTemp() {
  if(timerId.value) {
    clearInterval(timerId.value);
  }
  measureTempAction();
  timerId.value = setInterval(() => {
    measureTempAction();
  }, 10000);
}

function measureTempAction() {
  measureTempRequest(thermalDataByAreaApi, {
    videoWidth: videoWidth.value,
    videoHeight: videoHeight.value,
    cameraId: props.streamKey,
    points: pointValues.value,
  })
      .then((res) => {
        if (res.data) {
          drawResultText.value = '  ' + t('video.tempResult', { min: res.data.minTemperature, max: res.data.maxTemperature, avg: res.data.aveTemperature });
        }
      })
      .catch((e) => {
        drawer?.showFullScreenAlert(videoRef, e.toString())
      })
}
</script>

