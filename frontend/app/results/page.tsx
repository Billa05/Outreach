"use client"

import { useState } from "react"
import { Sidebar } from "@/components/chat/Sidebar"
import { Header } from "@/components/chat/Header"
import { ResultsView } from "@/components/chat/ResultsView"

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

export default function ResultsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filterOpen, setFilterOpen] = useState(true)
  const [selectedCard, setSelectedCard] = useState<number | null>(null)

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen bg-black overflow-hidden">
        <Header showOpenSidebarButton={!sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        <ResultsView
          filterOpen={filterOpen}
          onCloseFilter={() => setFilterOpen(false)}
          onOpenFilter={() => setFilterOpen(true)}
          companies={mockCompanies}
          selectedCompanyId={selectedCard}
          setSelectedCompanyId={setSelectedCard}
        />
      </div>
    </div>
  )
}


