"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/chat/Sidebar"
import { Header } from "@/components/chat/Header"
import { FileUploads } from "@/components/chat/FileUploads"
import { TopInput } from "@/components/chat/TopInput"

export default function ChatGPTClone() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [input, setInput] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() || uploadedFiles.length > 0) {
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
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen bg-black overflow-hidden">
        <Header showOpenSidebarButton={!sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="text-2xl font-medium mb-8 text-center">Ready when you are.</div>
          <div className="w-full max-w-2xl">
            <FileUploads files={uploadedFiles} onRemove={removeFile} size="large" />
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
  )
}
