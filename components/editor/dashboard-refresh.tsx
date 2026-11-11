"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function DashboardRefresh() {
  const router = useRouter()

  useEffect(() => {
    const refresh = () => router.refresh()
    window.addEventListener("focus", refresh)
    const interval = window.setInterval(refresh, 15_000)

    return () => {
      window.removeEventListener("focus", refresh)
      window.clearInterval(interval)
    }
  }, [router])

  return null
}
