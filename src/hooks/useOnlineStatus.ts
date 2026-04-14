import { useEffect, useMemo, useState } from 'react'
import { db } from '@/lib/db'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const refresh = async () => {
      const count = await db.syncQueue.count()
      if (mounted) setPendingSyncCount(count)
    }
    refresh()
    const interval = setInterval(refresh, 5_000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  return useMemo(() => ({ isOnline, pendingSyncCount }), [isOnline, pendingSyncCount])
}
