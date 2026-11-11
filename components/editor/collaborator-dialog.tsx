"use client"

import { useCallback, useState, type FormEvent } from "react"
import { Share2, Trash2 } from "lucide-react"
import { z } from "zod"
import { addCollaborator, removeCollaborator } from "@/actions/collaborators"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const CollaboratorsResponseSchema = z.object({
  collaborators: z.array(z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    email: z.string(),
  })),
})

const ApiErrorSchema = z.object({ error: z.string() })

type Collaborator = z.infer<typeof CollaboratorsResponseSchema>["collaborators"][number]

export function CollaboratorDialog({
  projectId,
  isOwner,
}: {
  projectId: string
  isOwner: boolean
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCollaborators = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/collaborators`,
        { cache: "no-store" },
      )
      const responseBody: unknown = await response.json()
      if (!response.ok) {
        const parsedError = ApiErrorSchema.safeParse(responseBody)
        throw new Error(parsedError.success ? parsedError.data.error : "Unable to load collaborators")
      }

      const result = CollaboratorsResponseSchema.safeParse(responseBody)
      if (!result.success) throw new Error("The collaborator list response was invalid")
      setCollaborators(result.data.collaborators)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load collaborators")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen && isOwner) void fetchCollaborators()
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isOwner || !email.trim() || pending) return

    setPending(true)
    setError(null)
    try {
      const result = await addCollaborator(projectId, email.trim())
      if (!result.ok) {
        setError(result.error)
        return
      }

      setEmail("")
      await fetchCollaborators()
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Unable to add collaborator")
    } finally {
      setPending(false)
    }
  }

  async function handleRemove(userId: string) {
    if (!isOwner || pending) return

    setPending(true)
    setError(null)
    try {
      const result = await removeCollaborator(projectId, userId)
      if (!result.ok) {
        setError(result.error)
        return
      }

      await fetchCollaborators()
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove collaborator")
    } finally {
      setPending(false)
    }
  }

  if (!isOwner) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          aria-label="Share"
          className="h-10 rounded-md bg-accent-ai px-4 text-bg-base transition-all hover:-translate-y-0.5 hover:bg-accent-ai/90 hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(90dvh,44rem)] overflow-y-auto border border-border-default bg-bg-surface text-text-primary">
        <DialogHeader>
          <DialogTitle>Manage collaborators</DialogTitle>
          <DialogDescription className="text-text-muted">
            Add people who already have a Systema account or remove existing collaborators.
          </DialogDescription>
        </DialogHeader>

        <form className="flex items-center gap-2" onSubmit={handleAdd}>
          <label htmlFor="collaborator-email" className="sr-only">Collaborator email</label>
          <Input
            id="collaborator-email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
            required
            className="min-w-0 border-border-default bg-bg-base text-text-primary placeholder:text-text-muted focus-visible:ring-accent-primary"
          />
          <Button type="submit" disabled={!email.trim() || pending}>
            Add
          </Button>
        </form>

        <section aria-labelledby="collaborators-heading" className="space-y-2">
          <h3 id="collaborators-heading" className="text-sm font-medium text-text-primary">
            Current collaborators
          </h3>
          {loading ? (
            <p className="py-4 text-sm text-text-muted" role="status">Loading collaborators...</p>
          ) : collaborators.length === 0 ? (
            <p className="py-4 text-sm text-text-muted">No collaborators have been added.</p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {collaborators.map((collaborator) => (
                <li
                  key={collaborator.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-base px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-text-primary">{collaborator.name}</span>
                    <span className="block truncate text-xs text-text-muted">
                      {collaborator.email || collaborator.userId}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${collaborator.name}`}
                    title={`Remove ${collaborator.name}`}
                    disabled={pending}
                    onClick={() => void handleRemove(collaborator.userId)}
                    className="shrink-0 text-text-muted hover:bg-state-error/10 hover:text-state-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && <p className="text-sm text-state-error" role="alert">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
