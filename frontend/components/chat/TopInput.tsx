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
      <div className="relative group">
        <Input
          value={input}
          onChange={onChange}
          placeholder="What companies are you looking for?"
          className="w-full rounded-2xl px-6 py-6 pr-36 text-base shadow-lg border-border/50 bg-card/95 backdrop-blur-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60"
          disabled={isLoading}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
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
            className="h-10 w-10 rounded-xl hover:bg-muted/50 transition-colors"
            title="Attach files"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !input.trim()}
            className="h-10 px-4 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}


