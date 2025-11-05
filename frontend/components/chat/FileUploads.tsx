"use client"

import { Button } from "@/components/ui/button"
import { FileText, X } from "lucide-react"

type FileUploadsProps = {
  files: File[]
  onRemove: (index: number) => void
  size?: "large" | "small"
}

export function FileUploads({ files, onRemove, size = "large" }: FileUploadsProps) {
  if (!files || files.length === 0) return null

  return (
    <div className={`${size === "large" ? "mb-4 p-4" : "mb-4 p-3"} bg-card rounded-xl border border-border`}>
      <div className="text-sm text-muted-foreground mb-2">Uploaded files:</div>
      <div className="space-y-2">
        {files.map((file, index) => (
          <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">{file.name}</span>
              <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="p-1 h-6 w-6"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}


