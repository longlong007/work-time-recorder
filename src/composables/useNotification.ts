import { ref } from 'vue'

export function useNotification() {
  const permission = ref<NotificationPermission>('default')

  function checkPermission() {
    if ('Notification' in window) {
      permission.value = Notification.permission
    }
    return permission.value
  }

  async function requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false
    }

    try {
      const result = await Notification.requestPermission()
      permission.value = result
      return result === 'granted'
    } catch {
      return false
    }
  }

  function show(title: string, options?: NotificationOptions) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return
    }

    const notification = new Notification(title, {
      tag: 'work-time-alarm',
      ...options
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  }

  return {
    permission,
    checkPermission,
    requestPermission,
    show
  }
}
