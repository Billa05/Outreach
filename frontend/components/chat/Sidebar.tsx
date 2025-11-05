"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import {
  MessageSquare,
  Search,
  BookOpen,
  Sparkles,
  Bot,
  FileText,
  X,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

type SidebarProps = {
  open: boolean
  onClose: () => void
}

type ChatItem = {
  id: number
  query_text: string
  created_at: string
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const router = useRouter()
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState(false)

  useEffect(() => {
    const fetchChatHistory = async () => {
      const token = localStorage.getItem('access_token')
      if (!token) return
      try {
        const response = await fetch('http://localhost:8000/chat_history', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setChatHistory(data)
        }
      } catch (error) {
        console.error('Error fetching chat history:', error)
      }
    }
    fetchChatHistory()
  }, [])

  const handleChatClick = (chatId: number) => {
    router.push(`/results?queryId=${chatId}`)
  }

  const sidebarItems = [
    { icon: MessageSquare, label: "New chat" },
    { icon: Search, label: "Search chats" },
    { icon: FileText, label: "API Docs" },
  ]

  return (
    <>
      <div
        className={`${open ? "w-64 md:w-64" : "w-0"} bg-sidebar flex flex-col transition-all duration-300 overflow-hidden border-r border-sidebar-border fixed md:relative z-50 h-full`}
      >
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-background rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-foreground rounded-full"></div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {sidebarItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent cursor-pointer text-sm text-sidebar-foreground"
                onClick={() => {
                  if (item.label === "New chat") {
                    router.push('/')
                  } else if (item.label === "Search chats") {
                    setSearchMode(!searchMode)
                  } else if (item.label === "API Docs") {
                    // Open docs
                  }
                }}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto min-h-0">
          <div className="text-xs text-muted-foreground mb-3 font-medium">Chats</div>
          {searchMode && (
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
          <div className="space-y-1">
            {chatHistory
              .filter(chat => chat.query_text.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((chat) => (
              <div
                key={chat.id}
                className="px-3 py-2 rounded-lg hover:bg-sidebar-accent cursor-pointer text-sm text-sidebar-foreground truncate"
                title={chat.query_text}
                onClick={() => handleChatClick(chat.id)}
              >
                {chat.query_text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-background/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
    </>
  )
}


