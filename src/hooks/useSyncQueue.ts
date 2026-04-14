import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { db } from '@/lib/db'

export function useSyncQueue() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const subscription = liveQuery(() => db.syncQueue.count()).subscribe({
      next: (value) => setCount(value)
    })
    return () => subscription.unsubscribe()
  }, [])

  return count
}
