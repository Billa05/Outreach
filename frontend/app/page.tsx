"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MessageSquare,
  Search,
  BookOpen,
  Sparkles,
  Bot,
  FileText,
  ChevronDown,
  Mic,
  Paperclip,
  Send,
  Menu,
  X,
  Upload,
  Mail,
} from "lucide-react"

export default function ChatGPTClone() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat()
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showResults, setShowResults] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [filterOpen, setFilterOpen] = useState(true)

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() || uploadedFiles.length > 0) {
      setHasStartedChat(true)
      setShowLoading(true)

      // Simulate backend processing
      await new Promise((resolve) => setTimeout(resolve, 3000))

      setShowLoading(false)
      setShowResults(true)
      setUploadedFiles([])
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const sidebarItems = [
    { icon: MessageSquare, label: "New chat", active: false },
    { icon: Search, label: "Search chats", active: false },
    { icon: BookOpen, label: "Library", active: false },
    { icon: Sparkles, label: "Sora", active: false },
    { icon: Bot, label: "GPTs", active: false },
    { icon: FileText, label: "API Docs", active: false },
  ]

  const chatHistory = [
    "CBC Report Interpretation",
    "Code Fix for Dijkstra",
    "LinkedIn Headline Suggestion",
    "3D Printing Automation Work...",
    "Deleting containers impact i...",
    "Prevent Arch Sleep",
    "Copying .txt File Content",
    "Snap in Docker Limitations",
    "Keep Laptop Always On",
    "Resume Experience Summary",
    "Delete exited containers",
    "Resume Optimization Tips",
    "Resume Formatting and Edit...",
    "Install PrusaSlicer via Snap",
    "Sticky Keys Disabled Arch",
  ]

  const mockCompanies = [
    {
      id: 1,
      name: "TechCorp Solutions",
      industry: "Technology",
      employees: "500-1000",
      location: "San Francisco, CA",
      description: "Leading software development company specializing in AI and machine learning solutions.",
      email: "contact@techcorp.com",
      website: "www.techcorp.com",
    },
    {
      id: 2,
      name: "Global Innovations Inc",
      industry: "Manufacturing",
      employees: "1000-5000",
      location: "New York, NY",
      description: "International manufacturing company with focus on sustainable production methods.",
      email: "info@globalinnovations.com",
      website: "www.globalinnovations.com",
    },
    {
      id: 3,
      name: "Digital Marketing Pro",
      industry: "Marketing",
      employees: "50-200",
      location: "Austin, TX",
      description: "Full-service digital marketing agency helping businesses grow their online presence.",
      email: "hello@digitalmarketingpro.com",
      website: "www.digitalmarketingpro.com",
    },
    {
      id: 4,
      name: "FinanceFirst Group",
      industry: "Finance",
      employees: "200-500",
      location: "Chicago, IL",
      description: "Financial services company providing investment and wealth management solutions.",
      email: "contact@financefirst.com",
      website: "www.financefirst.com",
    },
    {
      id: 5,
      name: "HealthTech Innovations",
      industry: "Healthcare",
      employees: "100-300",
      location: "Boston, MA",
      description: "Healthcare technology company developing innovative medical software solutions.",
      email: "info@healthtech.com",
      website: "www.healthtech.com",
    },
  ]

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64 md:w-64" : "w-0"
        } bg-gray-950 flex flex-col transition-all duration-300 overflow-hidden border-r border-gray-800 fixed md:relative z-50 h-full`}
      >
        {/* Sidebar Header */}
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
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Navigation Items */}
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

        {/* Chat History */}
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

        {/* Upgrade Plan */}
        <div className="p-4 border-t border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 cursor-pointer text-sm">
            <div className="w-4 h-4 bg-orange-500 rounded-full flex-shrink-0"></div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">Upgrade plan</div>
              <div className="text-xs text-gray-500 truncate">More access to the best models</div>
            </div>
          </div>
        </div>
      </div>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen bg-black overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0 bg-black">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8 flex-shrink-0"
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium truncate">ChatGPT</span>
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-3 md:px-4 py-2 text-xs md:text-sm">
              <span className="hidden sm:inline">Get Plus</span>
              <span className="sm:hidden">Plus</span>
            </Button>
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
              B
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-black">
          {showLoading ? (
            /* Loading Screen */
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
                <div className="text-xl font-medium mb-2">Processing your request...</div>
                <div className="text-gray-400">Our backend is analyzing your data</div>
              </div>
            </div>
          ) : showResults ? (
            /* Results Page */
            <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-black">
              {/* Filter Sidebar */}
              <div
                className={`${
                  filterOpen ? "w-full md:w-80" : "w-0"
                } bg-gray-950 border-r border-gray-700 transition-all duration-300 overflow-hidden ${
                  filterOpen ? "block" : "hidden md:block"
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-medium text-white">Filter Options</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilterOpen(false)}
                      className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Industry</label>
                      <select className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white">
                        <option>All Industries</option>
                        <option>Technology</option>
                        <option>Manufacturing</option>
                        <option>Marketing</option>
                        <option>Finance</option>
                        <option>Healthcare</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Company Size</label>
                      <select className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white">
                        <option>All Sizes</option>
                        <option>1-50</option>
                        <option>50-200</option>
                        <option>200-500</option>
                        <option>500-1000</option>
                        <option>1000+</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                      <select className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white">
                        <option>All Locations</option>
                        <option>California</option>
                        <option>New York</option>
                        <option>Texas</option>
                        <option>Illinois</option>
                        <option>Massachusetts</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Results Area */}
              <div className="flex-1 flex">
                {/* Company Cards */}
                <div
                  className={`${
                    selectedCard ? "w-full lg:w-1/2" : "w-full"
                  } transition-all duration-300 flex flex-col min-h-0`}
                >
                  <div className="p-4 md:p-6 flex-shrink-0 bg-black">
                    <div className="flex items-center justify-between mb-6">
                      <h1 className="text-xl md:text-2xl font-bold text-white truncate">Result Page</h1>
                      {!filterOpen && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFilterOpen(true)}
                          className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 flex-shrink-0"
                        >
                          <Menu className="w-4 h-4" />
                          <span className="ml-2 hidden sm:inline">Filters</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4 md:pb-6">
                    <div className="space-y-4">
                      {mockCompanies.map((company) => (
                        <div
                          key={company.id}
                          onClick={() => setSelectedCard(selectedCard === company.id ? null : company.id)}
                          className={`bg-gray-900 border-2 border-gray-600 rounded-2xl p-4 md:p-6 cursor-pointer transition-all duration-300 hover:border-gray-500 ${
                            selectedCard === company.id ? "border-blue-500 bg-gray-800" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-medium text-white mb-2 truncate" title={company.name}>
                                {company.name}
                              </h3>
                              <p className="text-gray-400 text-sm mb-1 truncate">
                                {company.industry} • {company.employees} employees
                              </p>
                              <p className="text-gray-400 text-sm truncate" title={company.location}>
                                {company.location}
                              </p>
                            </div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                // Handle email functionality
                              }}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white p-2 md:p-3 rounded-lg flex-shrink-0"
                            >
                              <Mail className="w-4 h-4 md:w-5 md:h-5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Company Details Panel */}
                {selectedCard && (
                  <div className="w-full lg:w-1/2 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-700 bg-black">
                    <div className="p-4 md:p-6 flex-1 overflow-y-auto">
                      <div className="bg-gray-900 border-2 border-gray-600 rounded-2xl p-4 md:p-6 h-full">
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-lg md:text-xl font-bold text-white truncate">Company Details</h2>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCard(null)}
                            className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {(() => {
                          const company = mockCompanies.find((c) => c.id === selectedCard)
                          if (!company) return null

                          return (
                            <div className="space-y-6">
                              <div>
                                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 break-words">
                                  {company.name}
                                </h3>
                                <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                                  {company.description}
                                </p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-400 mb-1">Industry</label>
                                  <p className="text-white text-sm md:text-base truncate" title={company.industry}>
                                    {company.industry}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-400 mb-1">Employees</label>
                                  <p className="text-white text-sm md:text-base">{company.employees}</p>
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                                  <p className="text-white text-sm md:text-base truncate" title={company.location}>
                                    {company.location}
                                  </p>
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-sm font-medium text-gray-400 mb-1">Website</label>
                                  <p className="text-blue-400 text-sm md:text-base truncate" title={company.website}>
                                    {company.website}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Contact Email</label>
                                <p className="text-white text-sm md:text-base break-all">{company.email}</p>
                              </div>

                              <div className="pt-4">
                                <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg flex items-center justify-center gap-2">
                                  <Mail className="w-4 h-4 md:w-5 md:h-5" />
                                  <span className="text-sm md:text-base">Send Email</span>
                                </Button>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : !hasStartedChat ? (
            /* Initial State - Centered */
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <div className="text-2xl font-medium mb-8 text-center">Ready when you are.</div>

              <div className="w-full max-w-2xl">
                {/* File Upload Area */}
                {uploadedFiles.length > 0 && (
                  <div className="mb-4 p-4 bg-gray-900 rounded-xl border border-gray-700">
                    <div className="text-sm text-gray-400 mb-2">Uploaded files:</div>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-800 p-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-400" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-gray-400 hover:text-white p-1 h-6 w-6"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleFormSubmit} className="relative">
                  <Input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Ask anything or upload documents"
                    className="w-full bg-gray-900 border-gray-700 rounded-full px-6 py-4 pr-32 text-white placeholder-gray-500 focus:border-gray-600 focus:ring-0"
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Chat State - Messages + Bottom Input */
            <>
              <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.map((message) => (
                    <div key={message.id} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                        {message.role === "user" ? (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-sm font-medium">
                            B
                          </div>
                        ) : (
                          <Bot className="w-5 h-5" />
                        )}
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
                          <div
                            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Input */}
              <div className="border-t border-gray-800 p-4">
                <div className="max-w-3xl mx-auto">
                  {/* File Upload Area */}
                  {uploadedFiles.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-900 rounded-xl border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Uploaded files:</div>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-800 p-2 rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-400" />
                              <span className="text-sm">{file.name}</span>
                              <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="text-gray-400 hover:text-white p-1 h-6 w-6"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleFormSubmit} className="relative">
                    <Input
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Ask anything or upload documents"
                      className="w-full bg-gray-900 border-gray-700 rounded-full px-6 py-4 pr-20 text-white placeholder-gray-500 focus:border-gray-600 focus:ring-0"
                      disabled={isLoading}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.txt,.md"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Button
                        type="submit"
                        disabled={(!input.trim() && uploadedFiles.length === 0) || isLoading}
                        className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-full p-2 h-8 w-8"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
