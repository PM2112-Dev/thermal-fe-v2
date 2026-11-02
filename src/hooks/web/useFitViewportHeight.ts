import { nextTick, onMounted, onUnmounted, ref, type Ref } from 'vue'

const MIN_HEIGHT = 300
// Ước lượng phần bên dưới (padding đáy khung chứa, viền tab...); phần sai lệch được trừ lại sau khi đo
const BOTTOM_GAP = 40

/** Khung cuộn gần nhất chứa phần tử (vd thân el-drawer), không có thì là cả trang. */
function findScroller(el: HTMLElement): HTMLElement {
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const overflowY = getComputedStyle(node).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') return node
  }
  return document.documentElement
}

/**
 * Chiều cao để phần tử lấp đúng phần còn lại của khung cuộn chứa nó (trang hoặc drawer), không phải cuộn.
 * `compact` = khung hẹp hơn `compactWidth`: nên xếp dọc và cuộn bình thường.
 */
export function useFitViewportHeight(el: Ref<HTMLElement | undefined>, compactWidth = 820) {
  const fitHeight = ref<number | null>(null)
  const compact = ref(false)

  function update() {
    if (!el.value) return
    const scroller = findScroller(el.value)
    const isPage = scroller === document.documentElement
    const viewportTop = isPage ? 0 : scroller.getBoundingClientRect().top
    const viewportHeight = isPage ? window.innerHeight : scroller.clientHeight
    // Vị trí phần tử tính từ đầu nội dung của khung cuộn
    const offsetTop = el.value.getBoundingClientRect().top - viewportTop + scroller.scrollTop
    fitHeight.value = Math.max(MIN_HEIGHT, viewportHeight - offsetTop - BOTTOM_GAP)
    // Sau khi áp chiều cao, nếu khung vẫn còn tràn (padding/viền khác ước lượng) thì trừ đúng phần tràn
    void nextTick(() => {
      const overflow = scroller.scrollHeight - (isPage ? window.innerHeight : scroller.clientHeight)
      if (overflow > 0 && fitHeight.value) fitHeight.value = Math.max(MIN_HEIGHT, fitHeight.value - overflow)
    })
  }

  let observer: ResizeObserver | undefined
  onMounted(() => {
    void nextTick(update)
    window.addEventListener('resize', update)
    // Tính lại khi chiều rộng đổi (kể cả lúc tab đang ẩn được hiện ra: rộng 0 → >0).
    // Không tính lại theo chiều cao vì chính chiều cao do hook này đặt, sẽ lặp vô hạn.
    let lastWidth = -1
    observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      compact.value = width < compactWidth
      if (width > 0 && width !== lastWidth) update()
      lastWidth = width
    })
    if (el.value) observer.observe(el.value)
  })
  onUnmounted(() => {
    window.removeEventListener('resize', update)
    observer?.disconnect()
  })

  return { fitHeight, compact }
}
