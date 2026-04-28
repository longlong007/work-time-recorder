import { onMounted, onUnmounted } from 'vue'

interface KeyboardHandlers {
  onSpace?: () => void
  onCtrlE?: () => void
  onCtrlV?: () => void
}

export function useKeyboard(handlers: KeyboardHandlers) {
  function handleKeydown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    if (e.code === 'Space' && handlers.onSpace) {
      e.preventDefault()
      handlers.onSpace()
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'e' && handlers.onCtrlE) {
      e.preventDefault()
      handlers.onCtrlE()
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && handlers.onCtrlV) {
      e.preventDefault()
      handlers.onCtrlV()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}
