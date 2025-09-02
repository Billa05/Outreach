"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/chat/Sidebar"
import { Header } from "@/components/chat/Header"
import { LoadingScreen } from "@/components/chat/LoadingScreen"
import { useState } from "react"

export default function ProcessPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/results")
    }, 2000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-screen bg-black overflow-hidden">
        <Header showOpenSidebarButton={!sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />
        <LoadingScreen />
      </div>
    </div>
  )
}


