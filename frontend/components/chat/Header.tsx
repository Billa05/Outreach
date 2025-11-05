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
    <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0 bg-background">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {showOpenSidebarButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSidebar}
            className="p-1 h-8 w-8 flex-shrink-0"
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
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="p-1 h-8 w-8"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 text-primary-foreground">
          B
        </div>
      </div>
    </div>
  )
}


