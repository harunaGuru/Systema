"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type RenameProjectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  pending: boolean
  error: string | null
  onSubmit: (name: string) => Promise<void>
}

export function RenameProjectDialog({
  open,
  onOpenChange,
  currentName,
  pending,
  error,
  onSubmit,
}: RenameProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <RenameProjectDialogForm
          currentName={currentName}
          pending={pending}
          error={error}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
        />
      )}
    </Dialog>
  )
}

function RenameProjectDialogForm({
  onOpenChange,
  currentName,
  pending,
  error,
  onSubmit,
}: Pick<
  RenameProjectDialogProps,
  "onOpenChange" | "currentName" | "pending" | "error" | "onSubmit"
>) {
  const [name, setName] = useState(currentName)
  const trimmedName = name.trim()

  function submit() {
    if (pending || !trimmedName || trimmedName === currentName.trim()) return

    void onSubmit(trimmedName)
  }

  return (
    <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
          <DialogDescription>Currently named &quot;{currentName}&quot;.</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          aria-label="Project name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              submit()
            }
          }}
          placeholder="Project name"
        />
        {error && <p className="text-sm text-state-error" role="alert">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            disabled={pending || !trimmedName || trimmedName === currentName.trim()}
            onClick={submit}
          >
            Save
          </Button>
        </DialogFooter>
    </DialogContent>
  )
}
