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

type CreateProjectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string) => void
}

function createSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <CreateProjectDialogForm onOpenChange={onOpenChange} onSubmit={onSubmit} />}
    </Dialog>
  )
}

function CreateProjectDialogForm({
  onOpenChange,
  onSubmit,
}: Pick<CreateProjectDialogProps, "onOpenChange" | "onSubmit">) {
  const [name, setName] = useState("")
  const slug = createSlug(name.trim())

  function submit() {
    const trimmedName = name.trim()
    if (!trimmedName || !slug) return

    onSubmit(trimmedName)
    onOpenChange(false)
  }

  return (
    <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Give your project a name. A slug will be generated automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
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
          <p className="text-xs text-text-muted">Slug: {slug || "—"}</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || !slug} onClick={submit}>
            Create
          </Button>
        </DialogFooter>
    </DialogContent>
  )
}
