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
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/auth/login')
      return
    }

    const fetchData = async () => {
      const query = localStorage.getItem('userQuery')
      if (!query) {
        router.push('/')
        return
      }

      try {
        const response = await fetch('http://localhost:8000/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ query }),
        })
        const data = await response.json()
        localStorage.setItem('extractionResults', JSON.stringify(data))
        router.push("/results")
      } catch (error) {
        console.error('Error fetching data:', error)
        // Handle error, maybe show a message or retry
        router.push("/results") // Still go to results even on error
      }
    }

    fetchData()
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


