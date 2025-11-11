"use client"

import { Bot } from "lucide-react"
import { useState, useEffect } from "react"
import { getUserInitial } from "@/lib/user-utils"

type ChatMessage = {
  id: string
  role: "user" | "assistant" | string
  content: string
}

type ChatMessagesProps = {
  messages: ChatMessage[]
  isLoading: boolean
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const [userInitial, setUserInitial] = useState<string>('U')

  useEffect(() => {
    setUserInitial(getUserInitial())
  }, [])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message) => (
          <div key={message.id} className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
              {message.role === "user" ? (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-sm font-medium">
                  {userInitial}
                </div>
              ) : (
                <Bot className="w-5 h-5" />)
              }
            </div>
            <div className="flex-1">
              <div className="prose prose-invert max-w-none">
                <p className="text-white whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


