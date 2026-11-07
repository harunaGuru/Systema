"use client"

import { Check } from "lucide-react"
import type { NodeColor } from "./shapes"

const colors: NodeColor[] = ["slate", "blue", "violet", "green", "amber", "rose"]

export function ColorPalette({
  currentColor,
  placement,
  alignment,
  onChange,
}: {
  currentColor: NodeColor
  placement: "above" | "below"
  alignment: "center" | "left" | "right"
  onChange: (color: NodeColor) => void
}) {
  const horizontalPosition =
    alignment === "left"
      ? "left-0"
      : alignment === "right"
        ? "left-auto right-0"
        : "left-1/2 -translate-x-1/2"

  return (
    <div
      className={`absolute z-50 flex gap-2 rounded-md border border-border-default bg-bg-elevated p-2 shadow-float ${horizontalPosition} ${
        placement === "above" ? "-top-12" : "top-full mt-2"
      }`}
    >
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
          style={{
            backgroundColor: "var(--color-node-" + color + ")",
            borderColor:
              currentColor === color
                ? "var(--color-accent-primary)"
                : "transparent",
          }}
          onClick={(event) => {
            event.stopPropagation()
            onChange(color)
          }}
          aria-label={`Set color ${color}`}
        >
          {currentColor === color && (
            <span className="pointer-events-none relative block h-full w-full">
              <Check className="pointer-events-none absolute inset-0 m-auto h-3 w-3 text-text-primary" />
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
