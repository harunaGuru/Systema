"use client"

import { useCallback, useEffect, useRef } from "react"
import { useUpdateMyPresence } from "@liveblocks/react"

type PresenceUpdate = Partial<Liveblocks["Presence"]>

const PRESENCE_INTERVAL_MS = 50

export function useThrottledPresence() {
  const updateMyPresence = useUpdateMyPresence()
  const lastSentAt = useRef(0)
  const pendingUpdate = useRef<PresenceUpdate>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    timer.current = null
    const update = pendingUpdate.current
    pendingUpdate.current = {}
    if (Object.keys(update).length === 0) return

    lastSentAt.current = Date.now()
    updateMyPresence(update)
  }, [updateMyPresence])

  const updatePresence = useCallback((update: PresenceUpdate) => {
    pendingUpdate.current = { ...pendingUpdate.current, ...update }
    if (timer.current === null) {
      timer.current = setTimeout(
        flush,
        Math.max(0, PRESENCE_INTERVAL_MS - (Date.now() - lastSentAt.current)),
      )
    }
  }, [flush])

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        clearTimeout(timer.current)
        timer.current = null
      }
    }
  }, [])

  return updatePresence
}
