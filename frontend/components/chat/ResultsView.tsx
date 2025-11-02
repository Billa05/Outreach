"use client"

import { Button } from "@/components/ui/button"
import { Menu, X, Mail, ThumbsUp, ThumbsDown } from "lucide-react"

export type ContactInfo = {
  name?: string
  designation?: string
  email?: string
  phone?: string
}

export type PerSourceResult = {
  socials: string[]
  summary: string
  contacts: ContactInfo[]
  fit_score: number
  response_id?: number
}

export type Company = {
  url: string
  perSourceResult: PerSourceResult
}

type ResultsViewProps = {
  filterOpen: boolean
  onCloseFilter: () => void
  onOpenFilter: () => void
  companies: Company[]
  selectedCompanyUrl: string | null
  setSelectedCompanyUrl: (url: string | null) => void
}

export function ResultsView({ filterOpen, onCloseFilter, onOpenFilter, companies, selectedCompanyUrl, setSelectedCompanyUrl }: ResultsViewProps) {
  const selectedCompany = companies.find((c) => c.url === selectedCompanyUrl) || null

  const handleFeedback = async (responseId: number | undefined, feedback: string) => {
    if (!responseId) return
    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      await fetch(`http://localhost:8000/feedback/${responseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ feedback }),
      })
      // Optionally, show a success message or update UI
    } catch (error) {
      console.error('Error sending feedback:', error)
    }
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-black">
      <div
        className={`${filterOpen ? "w-full md:w-80" : "w-0"} bg-gray-950 border-r border-gray-700 transition-all duration-300 overflow-hidden ${filterOpen ? "block" : "hidden md:block"}`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-white">Filter Options</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCloseFilter}
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

      <div className="flex-1 flex">
        <div className={`${selectedCompanyUrl ? "w-full lg:w-1/2" : "w-full"} transition-all duration-300 flex flex-col min-h-0`}>
          <div className="p-4 md:p-6 flex-shrink-0 bg-black">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-white truncate">Result Page</h1>
              {!filterOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenFilter}
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
              {companies.map((company) => (
                <div
                  key={company.url}
                  onClick={() => setSelectedCompanyUrl(selectedCompanyUrl === company.url ? null : company.url)}
                  className={`bg-gray-900 border-2 border-gray-600 rounded-2xl p-4 md:p-6 cursor-pointer transition-all duration-300 hover:border-gray-500 ${selectedCompanyUrl === company.url ? "border-blue-500 bg-gray-800" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-white mb-2 truncate" title={company.url}>
                        {company.url}
                      </h3>
                      <p className="text-gray-400 text-sm mb-1 truncate font-bold">
                        Fit Score: {company.perSourceResult.fit_score.toFixed(2)}%
                      </p>
                      <p className="text-gray-400 text-sm truncate" title={company.perSourceResult.summary}>
                        {company.perSourceResult.summary.substring(0, 100)}...
                      </p>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
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

        {selectedCompany && (
          <div className="w-full lg:w-1/2 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-700 bg-black">
            <div className="p-4 md:p-6 flex-1 flex flex-col min-h-0">
              <div className="bg-gray-900 border-2 border-gray-600 rounded-2xl p-4 md:p-6 flex-1 flex flex-col min-h-0">
                <div className="flex items-center mb-6 flex-shrink-0">
                  <h2 className="text-lg md:text-xl font-bold text-white truncate flex-1">Company Details</h2>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedback(selectedCompany.perSourceResult.response_id, 'positive')}
                      className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedback(selectedCompany.perSourceResult.response_id, 'negative')}
                      className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCompanyUrl(null)}
                      className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-2 break-words">{selectedCompany.url}</h3>
                    <p className="text-gray-400 text-sm md:text-base leading-relaxed break-words">{selectedCompany.perSourceResult.summary}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Fit Score</label>
                    <p className="text-white text-sm md:text-base font-bold">{selectedCompany.perSourceResult.fit_score.toFixed(2)}%</p>
                  </div>

                  {selectedCompany.perSourceResult.socials.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Social Links</label>
                      <div className="space-y-1">
                        {selectedCompany.perSourceResult.socials.map((social, idx) => (
                          <p key={idx} className="text-blue-400 text-sm md:text-base break-all">
                            <a href={social} target="_blank" rel="noopener noreferrer">{social}</a>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCompany.perSourceResult.contacts.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Contacts</label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedCompany.perSourceResult.contacts.map((contact, idx) => (
                          <div key={idx} className="bg-gray-800 p-3 rounded-lg">
                            {contact.name && <p className="text-white text-sm break-words"><strong>Name:</strong> {contact.name}</p>}
                            {contact.designation && <p className="text-white text-sm break-words"><strong>Designation:</strong> {contact.designation}</p>}
                            {contact.email && <p className="text-white text-sm break-all"><strong>Email:</strong> {contact.email}</p>}
                            {contact.phone && <p className="text-white text-sm break-all"><strong>Phone:</strong> {contact.phone}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex-shrink-0">
                    <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg flex items-center justify-center gap-2">
                      <Mail className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="text-sm md:text-base">Send Email</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


