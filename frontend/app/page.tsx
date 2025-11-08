"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/chat/Sidebar"
import { Header } from "@/components/chat/Header"
import { FileUploads } from "@/components/chat/FileUploads"
import { TopInput } from "@/components/chat/TopInput"

export default function ChatGPTClone() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [input, setInput] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/auth/login')
    }
  }, [router])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() || uploadedFiles.length > 0) {
      localStorage.setItem('userQuery', input.trim())
      localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles.map(f => f.name)))
      router.push("/process")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Home page only captures input and files; processing happens on /process and results on /results

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen bg-background overflow-hidden">
        <Header showOpenSidebarButton={!sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        <div className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>
          
          <div className="relative z-10 w-full max-w-3xl">
            {/* Hero Section */}
            <div className="text-center mb-12 space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent leading-tight">
                Find & Connect
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Discover the right contacts and start meaningful business conversations
              </p>
            </div>

            {/* Input Section */}
            <div className="w-full space-y-4">
              <FileUploads files={uploadedFiles} onRemove={removeFile} size="large" />
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-accent/50 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
                <div className="relative">
                  <TopInput
                    input={input}
                    onChange={(e) => setInput(e.target.value)}
                    isLoading={false}
                    onSubmit={handleFormSubmit}
                    fileInputRef={fileInputRef}
                    onFileUpload={handleFileUpload}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
