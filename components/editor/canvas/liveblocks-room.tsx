"use client"

import { LiveblocksProvider, RoomProvider, useSelf } from "@liveblocks/react"
import type { ResolveUsersArgs } from "@liveblocks/client"
import { ClientSideSuspense, useErrorListener, useEventListener } from "@liveblocks/react/suspense"
import { useCallback, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useThrottledPresence } from "@/hooks/use-throttled-presence"

const resolvedUsersSchema = z.array(
  z.object({ name: z.string(), color: z.string() }),
)

const editableSelector = "input, textarea, select, [contenteditable='true']"

function PresenceInputTracker() {
  const updatePresence = useThrottledPresence()

  useEffect(() => {
    function onFocusIn(event: FocusEvent) {
      if (event.target instanceof Element && event.target.matches(editableSelector)) {
        updatePresence({ action: "typing" })
      }
    }

    function onFocusOut(event: FocusEvent) {
      if (!(event.target instanceof Element) || !event.target.matches(editableSelector)) return
      if (event.relatedTarget instanceof Element && event.relatedTarget.matches(editableSelector)) return
      updatePresence({ action: null })
    }

    document.addEventListener("focusin", onFocusIn)
    document.addEventListener("focusout", onFocusOut)
    return () => {
      document.removeEventListener("focusin", onFocusIn)
      document.removeEventListener("focusout", onFocusOut)
    }
  }, [updatePresence])

  return null
}

function RemovedUserRedirect({ projectId }: { projectId: string }) {
  const router = useRouter()
  const self = useSelf()

  useEventListener(({ event }) => {
    if (
      event.type === "COLLABORATOR_REMOVED" &&
      event.userId === self?.id
    ) {
      window.alert("You have been removed from this project.")
      router.push("/editor")
    }
  })

  useErrorListener((error) => {
    if (
      error.context.type === "ROOM_CONNECTION_ERROR" &&
      error.context.roomId === projectId &&
      error.context.code === 4001
    ) {
      router.push("/editor")
    }
  })

  return null
}

export function LiveblocksRoom({
  projectId,
  children,
}: {
  projectId: string
  children: ReactNode
}) {
  const resolveUsers = useCallback(async ({ userIds }: ResolveUsersArgs) => {
    const response = await fetch("/api/liveblocks-users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomId: projectId, userIds }),
    })
    if (!response.ok) throw new Error("Unable to resolve collaborators")

    const parsed = resolvedUsersSchema.safeParse(await response.json())
    if (!parsed.success || parsed.data.length !== userIds.length) {
      throw new Error("Invalid collaborator information")
    }

    return parsed.data
  }, [projectId])

  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      resolveUsers={resolveUsers}
    >
      <RoomProvider
        id={projectId}
        initialPresence={{
          cursor: null,
          action: null,
          selection: { nodeIds: [], edgeIds: [] },
          aiJobRunning: false,
          aiJobUser: null,
        }}
      >
        <RemovedUserRedirect projectId={projectId} />
        <PresenceInputTracker />
        <ClientSideSuspense
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-text-muted">
              Loading room...
            </div>
          }
        >
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  )
}
