"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react"

type TemplateImporter = (templateId: string) => void

type TemplateImportContextValue = {
  importTemplate: (templateId: string) => void
  registerTemplateImporter: (importer: TemplateImporter) => () => void
}

const TemplateImportContext = createContext<TemplateImportContextValue | null>(null)

export function TemplateImportProvider({
  children,
  onImported,
}: {
  children: ReactNode
  onImported: () => void
}) {
  const importerRef = useRef<TemplateImporter | null>(null)

  const registerTemplateImporter = useCallback((importer: TemplateImporter) => {
    importerRef.current = importer
    return () => {
      if (importerRef.current === importer) importerRef.current = null
    }
  }, [])

  const importTemplate = useCallback(
    (templateId: string) => {
      importerRef.current?.(templateId)
      onImported()
    },
    [onImported],
  )

  const value = useMemo(
    () => ({ importTemplate, registerTemplateImporter }),
    [importTemplate, registerTemplateImporter],
  )

  return (
    <TemplateImportContext.Provider value={value}>
      {children}
    </TemplateImportContext.Provider>
  )
}

export function useTemplateImport() {
  const context = useContext(TemplateImportContext)
  if (!context) {
    throw new Error("Template import must be used inside TemplateImportProvider")
  }
  return context
}
