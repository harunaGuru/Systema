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
  onSubmit: (name: string) => void
}

export function RenameProjectDialog({
  open,
  onOpenChange,
  currentName,
  onSubmit,
}: RenameProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <RenameProjectDialogForm
          currentName={currentName}
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
  onSubmit,
}: Pick<RenameProjectDialogProps, "onOpenChange" | "currentName" | "onSubmit">) {
  const [name, setName] = useState(currentName)
  const trimmedName = name.trim()

  function submit() {
    if (!trimmedName || trimmedName === currentName.trim()) return

    onSubmit(trimmedName)
    onOpenChange(false)
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
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!trimmedName || trimmedName === currentName.trim()}
            onClick={submit}
          >
            Save
          </Button>
        </DialogFooter>
    </DialogContent>
  )
}
