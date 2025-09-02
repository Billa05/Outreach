"use client"

import { Button } from "@/components/ui/button"
import { Menu, X, Mail } from "lucide-react"

export type Company = {
  id: number
  name: string
  industry: string
  employees: string
  location: string
  description: string
  email: string
  website: string
}

type ResultsViewProps = {
  filterOpen: boolean
  onCloseFilter: () => void
  onOpenFilter: () => void
  companies: Company[]
  selectedCompanyId: number | null
  setSelectedCompanyId: (id: number | null) => void
}

export function ResultsView({ filterOpen, onCloseFilter, onOpenFilter, companies, selectedCompanyId, setSelectedCompanyId }: ResultsViewProps) {
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || null

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
        <div className={`${selectedCompanyId ? "w-full lg:w-1/2" : "w-full"} transition-all duration-300 flex flex-col min-h-0`}>
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
                  key={company.id}
                  onClick={() => setSelectedCompanyId(selectedCompanyId === company.id ? null : company.id)}
                  className={`bg-gray-900 border-2 border-gray-600 rounded-2xl p-4 md:p-6 cursor-pointer transition-all duration-300 hover:border-gray-500 ${selectedCompanyId === company.id ? "border-blue-500 bg-gray-800" : ""}`}
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
            <div className="p-4 md:p-6 flex-1 overflow-y-auto">
              <div className="bg-gray-900 border-2 border-gray-600 rounded-2xl p-4 md:p-6 h-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg md:text-xl font-bold text-white truncate">Company Details</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCompanyId(null)}
                    className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 h-8 w-8 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-2 break-words">{selectedCompany.name}</h3>
                    <p className="text-gray-400 text-sm md:text-base leading-relaxed">{selectedCompany.description}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Industry</label>
                      <p className="text-white text-sm md:text-base truncate" title={selectedCompany.industry}>
                        {selectedCompany.industry}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Employees</label>
                      <p className="text-white text-sm md:text-base">{selectedCompany.employees}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                      <p className="text-white text-sm md:text-base truncate" title={selectedCompany.location}>
                        {selectedCompany.location}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Website</label>
                      <p className="text-blue-400 text-sm md:text-base truncate" title={selectedCompany.website}>
                        {selectedCompany.website}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Contact Email</label>
                    <p className="text-white text-sm md:text-base break-all">{selectedCompany.email}</p>
                  </div>

                  <div className="pt-4">
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


