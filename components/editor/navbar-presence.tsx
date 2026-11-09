"use client"

import { shallow, useOthers } from "@liveblocks/react"
import { Popover } from "radix-ui"

export function NavbarPresence() {
  const others = useOthers(
    (users) => users.map(({ connectionId, info }) => ({
      connectionId,
      name: info.name,
      color: info.color,
    })),
    shallow,
  )
  if (others.length === 0) return null

  const visibleOthers = others.slice(0, 3)
  const remainingCount = others.length - visibleOthers.length

  return (
    <div className="flex items-center -space-x-2" aria-label="Project collaborators">
      {visibleOthers.map((other) => {
        const name = other.name || "Collaborator"

        return (
          <div
            key={other.connectionId}
            aria-label={name}
            title={name}
            style={{ backgroundColor: other.color }}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-bg-base text-xs uppercase text-text-primary"
          >
            {name.charAt(0)}
          </div>
        )
      })}
      {remainingCount > 0 && (
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label={`${remainingCount} more collaborators`}
              title="Show all collaborators"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-bg-base bg-bg-elevated text-xs text-text-primary hover:bg-accent-primary focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
            >
              +{remainingCount}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              side="bottom"
              sideOffset={8}
              data-testid="collaborator-popover"
              className="z-[60] w-56 rounded-md border border-border-default bg-bg-elevated p-2 text-text-primary shadow-float"
            >
              <p className="px-2 py-1 text-xs font-medium text-text-muted">
                Online collaborators
              </p>
              <ul className="max-h-64 overflow-y-auto">
                {others.map((other) => {
                  const name = other.name || "Collaborator"
                  return (
                    <li
                      key={other.connectionId}
                      className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-primary"
                    >
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: other.color }}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs uppercase text-text-primary"
                      >
                        {name.charAt(0)}
                      </span>
                      <span className="truncate">{name}</span>
                    </li>
                  )
                })}
              </ul>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  )
}
