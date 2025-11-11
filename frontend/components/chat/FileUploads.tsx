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
    <div className={`${size === "large" ? "mb-4 p-3 sm:p-4" : "mb-4 p-3"} bg-card rounded-lg sm:rounded-xl border border-border`}>
      <div className="text-xs sm:text-sm text-muted-foreground mb-2">Uploaded files:</div>
      <div className="space-y-2">
        {files.map((file, index) => (
          <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-lg gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm text-foreground truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="p-1 h-6 w-6 flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}


