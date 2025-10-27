"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/chat/Sidebar"
import { Header } from "@/components/chat/Header"
import { ResultsView, Company } from "@/components/chat/ResultsView"

export default function ResultsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filterOpen, setFilterOpen] = useState(true)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    const data = localStorage.getItem('extractionResults')
    if (data) {
      const parsed = JSON.parse(data)
      const contactsFound = parsed.contacts_found || {}
      const companyList: Company[] = Object.entries(contactsFound).map(([url, result]: [string, any]) => ({
        url,
        perSourceResult: {
          ...result,
          response_id: result.response_id
        }
      }))
      companyList.sort((a, b) => b.perSourceResult.fit_score - a.perSourceResult.fit_score)
      setCompanies(companyList)
    }
  }, [])

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen bg-black overflow-hidden">
        <Header showOpenSidebarButton={!sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        <ResultsView
          filterOpen={filterOpen}
          onCloseFilter={() => setFilterOpen(false)}
          onOpenFilter={() => setFilterOpen(true)}
          companies={companies}
          selectedCompanyUrl={selectedCard}
          setSelectedCompanyUrl={setSelectedCard}
        />
      </div>
    </div>
  )
}


