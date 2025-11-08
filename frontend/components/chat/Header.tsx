"use client"

import { Button } from "@/components/ui/button"
import { Menu, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type HeaderProps = {
  showOpenSidebarButton: boolean
  onOpenSidebar: () => void
}

export function Header({ showOpenSidebarButton, onOpenSidebar }: HeaderProps) {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    router.push('/auth/login')
  }

  return (
    <div className="flex items-center justify-between p-4 border-b border-border/50 flex-shrink-0 bg-background/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {showOpenSidebarButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSidebar}
            className="p-1 h-9 w-9 flex-shrink-0 hover:bg-muted/50 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
            <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-lg truncate group-hover:text-primary transition-colors">
            Outreach
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="h-9 px-3 gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline text-sm font-medium">Logout</span>
        </Button>
        <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-primary-foreground shadow-sm ring-2 ring-background ring-offset-2">
          B
        </div>
      </div>
    </div>
  )
}


