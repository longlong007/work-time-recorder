import { ref } from 'vue'

export function useVoiceInput() {
  const isListening = ref(false)
  const transcript = ref('')
  let recognition: SpeechRecognition | null = null

  function init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      return false
    }
    return true
  }

  function start(onResult: (text: string) => void) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    try {
      recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'zh-CN'

      recognition.onstart = () => {
        isListening.value = true
      }

      recognition.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += t
          } else {
            interimTranscript += t
          }
        }

        const text = finalTranscript || interimTranscript
        transcript.value = text
        onResult(text)
      }

      recognition.onerror = (event) => {
        if (['not-allowed', 'service-not-allowed'].includes(event.error)) {
          stop()
        }
      }

      recognition.onend = () => {
        isListening.value = false
        recognition = null
      }

      recognition.start()
    } catch {
      isListening.value = false
      recognition = null
    }
  }

  function stop() {
    if (recognition) {
      recognition.stop()
      recognition = null
    }
    isListening.value = false
  }

  function toggle(onResult: (text: string) => void) {
    if (isListening.value) {
      stop()
    } else {
      start(onResult)
    }
  }

  return {
    isListening,
    transcript,
    init,
    start,
    stop,
    toggle
  }
}
