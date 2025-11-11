"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/chat/Sidebar"
import { Header } from "@/components/chat/Header"
import { ResultsView, Company } from "@/components/chat/ResultsView"

function ResultsContent() {
  const searchParams = useSearchParams()
  const queryId = searchParams.get('queryId')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setSelectedCard(null) // Reset selected card when query changes
      let data
      if (queryId) {
        const token = localStorage.getItem('access_token')
        if (!token) {
          setLoading(false)
          return
        }
        try {
          const response = await fetch(`https://out-reach.duckdns.org:8000/query/${queryId}/responses`, {
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
      setLoading(false)
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
          queryId={queryId}
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


