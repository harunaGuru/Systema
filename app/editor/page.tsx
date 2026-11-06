import { EditorShell } from "@/components/editor/editor-shell"
import { auth } from "@clerk/nextjs/server";

export default async function EditorPage() {
  await auth.protect();

  return <EditorShell />
}
