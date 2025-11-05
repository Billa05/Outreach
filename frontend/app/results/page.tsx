"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/chat/Sidebar"
import { Header } from "@/components/chat/Header"
import { ResultsView, Company } from "@/components/chat/ResultsView"

function ResultsContent() {
  const searchParams = useSearchParams()
  const queryId = searchParams.get('queryId')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    const fetchData = async () => {
      let data
      if (queryId) {
        const token = localStorage.getItem('access_token')
        if (!token) return
        try {
          const response = await fetch(`http://localhost:8000/query/${queryId}/responses`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
          if (response.ok) {
            data = await response.json()
          }
        } catch (error) {
          console.error('Error fetching query responses:', error)
        }
      } else {
        data = JSON.parse(localStorage.getItem('extractionResults') || '{}')
      }
      if (data) {
        const contactsFound = data.contacts_found || {}
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
    }
    fetchData()
  }, [queryId])

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen bg-background overflow-hidden">
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

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-background text-foreground items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}


