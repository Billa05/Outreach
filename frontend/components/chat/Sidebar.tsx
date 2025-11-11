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
        const response = await fetch('https://out-reach.duckdns.org:8000/chat_history', {
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
    onClose() // Close the sidebar when a chat is clicked
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
        className={`${open ? "w-full sm:w-64 md:w-72" : "w-0"} bg-sidebar/95 backdrop-blur-sm flex flex-col transition-all duration-300 overflow-hidden border-r border-sidebar-border/50 fixed md:relative z-50 h-full shadow-xl`}
      >
        <div className="p-3 sm:p-4 border-b border-sidebar-border/50">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-sidebar-accent/50 transition-colors md:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            {sidebarItems.map((item, index) => (
              <button
                key={index}
                className="w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg hover:bg-sidebar-accent/50 cursor-pointer text-xs sm:text-sm text-sidebar-foreground transition-all group"
                onClick={() => {
                  if (item.label === "New chat") {
                    onClose() // Close sidebar when navigating to new chat
                    router.push('/')
                  } else if (item.label === "Search chats") {
                    setSearchMode(!searchMode)
                  } else if (item.label === "API Docs") {
                    // Open docs
                  }
                }}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sidebar-accent/50 flex items-center justify-center group-hover:bg-sidebar-accent transition-colors flex-shrink-0">
                  <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                </div>
                <span className="truncate font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-3 sm:p-4 overflow-y-auto min-h-0">
          <div className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wide">Recent Searches</div>
          {searchMode && (
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 sm:py-2.5 bg-input text-foreground border border-border/50 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
            </div>
          )}
          <div className="space-y-1.5">
            {chatHistory
              .filter(chat => chat.query_text.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((chat) => (
              <div
                key={chat.id}
                className="px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg hover:bg-sidebar-accent/50 cursor-pointer text-xs sm:text-sm text-sidebar-foreground transition-all group relative overflow-hidden"
                title={chat.query_text}
                onClick={() => handleChatClick(chat.id)}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{chat.query_text}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(chat.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {chatHistory.length === 0 && (
              <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm">
                <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-30" />
                <p>No searches yet</p>
                <p className="text-xs mt-1">Start a new search to see history</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}
    </>
  )
}


