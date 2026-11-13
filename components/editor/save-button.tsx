"use client"

import { useState } from "react"
import { LoaderCircle, Save } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SaveButton({
  save,
  isSaving,
}: {
  save: () => Promise<void>
  isSaving: boolean
}) {
  const [saveFailed, setSaveFailed] = useState(false)

  async function handleSave() {
    try {
      await save()
      setSaveFailed(false)
    } catch (error) {
      console.error("Manual save failed:", error)
      setSaveFailed(true)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        onClick={() => void handleSave()}
        disabled={isSaving}
        aria-label={isSaving ? "Saving canvas" : "Save canvas"}
        title={isSaving ? "Saving..." : "Save"}
      >
        {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {isSaving ? "Saving..." : "Save"}
      </Button>
      {saveFailed && <span role="alert" className="text-sm text-state-error">Save failed. Retry.</span>}
    </div>
  )
}
