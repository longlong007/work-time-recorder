import { ref } from 'vue'

export function useAlarm() {
  const alarmMinutes = ref(0)
  const alarmEnabled = ref(false)
  let alarmTimeoutId: number | null = null
  let audioContext: AudioContext | null = null

  function setAlarm(minutes: number, onTrigger: () => void) {
    clearAlarm()
    alarmMinutes.value = minutes
    alarmEnabled.value = true

    unlockAudio()

    alarmTimeoutId = window.setTimeout(() => {
      triggerAlarm()
      onTrigger()
    }, minutes * 60 * 1000)
  }

  function clearAlarm() {
    if (alarmTimeoutId) {
      clearTimeout(alarmTimeoutId)
      alarmTimeoutId = null
    }
    alarmMinutes.value = 0
    alarmEnabled.value = false
  }

  function unlockAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioContextClass()
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }
  }

  function playAlarmSound() {
    if (!audioContext) return

    const playBeep = (time: number, duration: number, frequency: number) => {
      const oscillator = audioContext!.createOscillator()
      const gainNode = audioContext!.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext!.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, time)
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration)

      oscillator.start(time)
      oscillator.stop(time + duration)
    }

    const now = audioContext.currentTime + 0.05
    playBeep(now, 0.3, 880)
    playBeep(now + 0.35, 0.3, 880)
    playBeep(now + 0.7, 0.3, 880)
  }

  function triggerAlarm() {
    playAlarmSound()
  }

  function releaseAudio() {
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close()
      audioContext = null
    }
  }

  return {
    alarmMinutes,
    alarmEnabled,
    setAlarm,
    clearAlarm,
    triggerAlarm,
    releaseAudio
  }
}
