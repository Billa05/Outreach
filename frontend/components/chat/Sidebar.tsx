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

type SidebarProps = {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const sidebarItems = [
    { icon: MessageSquare, label: "New chat" },
    { icon: Search, label: "Search chats" },
    { icon: FileText, label: "API Docs" },
  ]

  const chatHistory = [
    "Demo",
    "Demo 2",
  ]

  return (
    <>
      <div
        className={`${open ? "w-64 md:w-64" : "w-0"} bg-gray-950 flex flex-col transition-all duration-300 overflow-hidden border-r border-gray-800 fixed md:relative z-50 h-full`}
      >
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-black rounded-full"></div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {sidebarItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 cursor-pointer text-sm"
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto min-h-0">
          <div className="text-xs text-gray-500 mb-3 font-medium">Chats</div>
          <div className="space-y-1">
            {chatHistory.map((chat, index) => (
              <div
                key={index}
                className="px-3 py-2 rounded-lg hover:bg-gray-800 cursor-pointer text-sm text-gray-300 truncate"
                title={chat}
              >
                {chat}
              </div>
            ))}
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
    </>
  )
}


