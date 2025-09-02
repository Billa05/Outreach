"use client"

import type React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Paperclip, Upload, Mic } from "lucide-react"

type TopInputProps = {
  input: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isLoading: boolean
  onSubmit: (e: React.FormEvent) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function TopInput({ input, onChange, isLoading, onSubmit, fileInputRef, onFileUpload }: TopInputProps) {
  return (
    <form onSubmit={onSubmit} className="relative">
      <Input
        value={input}
        onChange={onChange}
        placeholder="Ask anything or upload documents"
        className="w-full bg-gray-900 border-gray-700 rounded-full px-6 py-4 pr-32 text-white placeholder-gray-500 focus:border-gray-600 focus:ring-0"
        disabled={isLoading}
      />
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.md"
          onChange={onFileUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8"
        >
          <Upload className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8"
        >
          <Mic className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
}


