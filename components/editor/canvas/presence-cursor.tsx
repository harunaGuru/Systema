"use client"

import { useOther, useUser } from "@liveblocks/react"
import { Cursor } from "@liveblocks/react-ui"
import type { CursorsCursorProps } from "@liveblocks/react-flow"

export function PresenceCursor({ userId, connectionId }: CursorsCursorProps) {
  const { user } = useUser(userId)
  const action = useOther(connectionId, (other) => other.presence.action)

  return (
    <div className="relative">
      <Cursor color={user?.color} label={user?.name} />
      {action && (
        <span className="pointer-events-none absolute left-4 top-5 whitespace-nowrap rounded-full border border-border-subtle bg-bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-primary shadow-sm">
          {action === "typing" ? "Typing..." : "Connecting..."}
        </span>
      )}
    </div>
  )
}
