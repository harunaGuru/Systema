"use client"

import { useState } from "react"
import { slugify } from "@/lib/slug"
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
  onSubmit: (
    name: string,
    idSuffix: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
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
  const [idSuffix, setIdSuffix] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const slug = slugify(name.trim())
  const projectId = slug && idSuffix ? `${slug}-${idSuffix}` : slug

  async function submit() {
    const trimmedName = name.trim()
    if (!trimmedName || !slug || !idSuffix) return

    setPending(true)
    setError(null)
    try {
      const result = await onSubmit(trimmedName, idSuffix)
      if (!result.ok) setError(result.error)
    } finally {
      setPending(false)
    }
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
            onChange={(event) => {
              setName(event.target.value)
              if (event.target.value.trim() && !idSuffix) {
                setIdSuffix(crypto.randomUUID().replace(/-/g, "").slice(0, 12))
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                submit()
              }
            }}
            placeholder="Project name"
          />
          <p className="text-xs text-text-muted">Slug: {projectId || "—"}</p>
          {error && <p className="text-sm text-state-error" role="alert">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || !slug || !idSuffix || pending} onClick={submit}>
            Create
          </Button>
        </DialogFooter>
    </DialogContent>
  )
}
