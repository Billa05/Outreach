"use client"

import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import Link from "next/link"

type HeaderProps = {
  showOpenSidebarButton: boolean
  onOpenSidebar: () => void
}

export function Header({ showOpenSidebarButton, onOpenSidebar }: HeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0 bg-black">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {showOpenSidebarButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSidebar}
            className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8 flex-shrink-0"
          >
            <Menu className="w-4 h-4" />
          </Button>
        )}
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/" className="font-medium truncate hover:underline">
            Outreach
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
          B
        </div>
      </div>
    </div>
  )
}


