"use client"

import { Button } from "@/components/ui/button"
import { Menu, X, Mail, ThumbsUp, ThumbsDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useState, useEffect } from "react"
import { useIsMobile } from "@/hooks/use-mobile"

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
  queryId: string | null
}

export function ResultsView({ filterOpen, onCloseFilter, onOpenFilter, companies, selectedCompanyUrl, setSelectedCompanyUrl, queryId }: ResultsViewProps) {
  const selectedCompany = companies.find((c) => c.url === selectedCompanyUrl) || null
  const [emailLoading, setEmailLoading] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState<number | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [feedbackState, setFeedbackState] = useState<Map<number, 'positive' | 'negative'>>(new Map())
  const isMobile = useIsMobile()
  
  // Ensure mobile detection works on initial render
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768
    }
    return false
  })
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Use the more reliable mobile detection
  const isMobileDevice = isMobile || isMobileView

  const handleFeedback = async (responseId: number | undefined, feedback: 'positive' | 'negative') => {
    if (!responseId) return
    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      setFeedbackLoading(responseId)
      const response = await fetch(`https://out-reach.duckdns.org:8000/feedback/${responseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ feedback }),
      })
      if (response.ok) {
        // Store feedback state to persist the visual indication
        setFeedbackState(prev => new Map(prev).set(responseId, feedback))
        console.log('Feedback submitted successfully')
      } else {
        console.error('Failed to submit feedback:', response.statusText)
      }
    } catch (error) {
      console.error('Error sending feedback:', error)
    } finally {
      setFeedbackLoading(null)
    }
  }

  const FilterContent = () => (
    <div>
      <div className="space-y-4 sm:space-y-5">
        <div>
          <label className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-2.5 text-muted-foreground">Industry</label>
          <select className="w-full bg-input/50 backdrop-blur-sm border border-border/50 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer">
            <option>All Industries</option>
            <option>Technology</option>
            <option>Manufacturing</option>
            <option>Marketing</option>
            <option>Finance</option>
            <option>Healthcare</option>
          </select>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-2.5 text-muted-foreground">Company Size</label>
          <select className="w-full bg-input/50 backdrop-blur-sm border border-border/50 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer">
            <option>All Sizes</option>
            <option>1-50</option>
            <option>50-200</option>
            <option>200-500</option>
            <option>500-1000</option>
            <option>1000+</option>
          </select>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-2.5 text-muted-foreground">Location</label>
          <select className="w-full bg-input/50 backdrop-blur-sm border border-border/50 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer">
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
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 max-h-full bg-gradient-to-br from-background via-background to-muted/10 relative">
      {/* Subtle background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-48 h-48 sm:w-72 sm:h-72 bg-primary/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 sm:w-96 sm:h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      {/* Desktop Filter Sidebar */}
      {!isMobileDevice && (
        <div
          className={`${filterOpen ? "w-full md:w-80" : "w-0"} bg-sidebar/95 backdrop-blur-sm border-r border-border/50 transition-all duration-300 overflow-hidden ${filterOpen ? "block" : "hidden"} shadow-xl relative z-10`}
        >
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Filter Options</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCloseFilter}
                className="h-8 w-8 rounded-lg hover:bg-sidebar-accent/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <FilterContent />
          </div>
        </div>
      )}

      {/* Mobile Filter Sheet */}
      {isMobileDevice && (
        <Sheet open={filterOpen} onOpenChange={(open) => !open && onCloseFilter()}>
          <SheetContent side="left" className="w-3/4 sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>Filter Options</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <div className={`flex-1 flex ${selectedCompanyUrl && !isMobileDevice ? "flex-row" : "flex-col"} relative z-10 min-h-0`}>
        <div className={`${selectedCompanyUrl && !isMobileDevice ? "w-full lg:w-1/2" : "w-full"} ${selectedCompanyUrl && isMobileDevice ? "hidden" : "flex"} transition-all duration-300 flex-col min-h-0 h-full`}>
          <div className="p-3 sm:p-4 md:p-6 flex-shrink-0 bg-background/80 backdrop-blur-sm border-b border-border/50 z-10">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground bg-clip-text text-transparent">
                  Your Leads
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {companies.length} {companies.length === 1 ? 'company' : 'companies'} found
                </p>
              </div>
              {!filterOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenFilter}
                  className="h-9 sm:h-10 px-3 sm:px-4 gap-2 rounded-lg sm:rounded-xl hover:bg-muted/50 transition-colors flex-shrink-0"
                >
                  <Menu className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium text-xs sm:text-sm">Filters</span>
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 pb-6 sm:pb-8 md:pb-10 min-h-0">
            <div className="space-y-3 sm:space-y-4 pb-2">
              {companies.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Try a different search query or adjust your filters</p>
                </div>
              ) : (
                companies.map((company, index) => (
                  <div
                    key={company.url}
                    onClick={() => setSelectedCompanyUrl(selectedCompanyUrl === company.url ? null : company.url)}
                    className={`group bg-card/95 backdrop-blur-sm border-2 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.01] ${
                      selectedCompanyUrl === company.url 
                        ? "border-primary shadow-lg shadow-primary/20 bg-primary/5" 
                        : "border-border/50 hover:border-primary/50"
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Fit Score Badge */}
                        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 flex-wrap">
                          <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1 sm:gap-1.5 ${
                            company.perSourceResult.fit_score >= 80 
                              ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                              : company.perSourceResult.fit_score >= 60 
                              ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" 
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {company.perSourceResult.fit_score.toFixed(0)}% Match
                          </div>
                          {company.perSourceResult.contacts.length > 0 && (
                            <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {company.perSourceResult.contacts.length} {company.perSourceResult.contacts.length === 1 ? 'Contact' : 'Contacts'}
                            </div>
                          )}
                        </div>

                        {/* Company URL */}
                        <h3 className="text-base sm:text-lg font-bold mb-2 truncate group-hover:text-primary transition-colors" title={company.url}>
                          {company.url.replace(/^https?:\/\/(www\.)?/, '')}
                        </h3>

                        {/* Summary */}
                        <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3" title={company.perSourceResult.summary}>
                          {company.perSourceResult.summary}
                        </p>

                        {/* Social Links Preview */}
                        {company.perSourceResult.socials.length > 0 && (
                          <div className="mt-2 sm:mt-3 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground font-medium">Socials:</span>
                            <div className="flex gap-1">
                              {company.perSourceResult.socials.slice(0, 3).map((social, idx) => (
                                <a
                                  key={idx}
                                  href={social}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-muted/50 hover:bg-primary/20 flex items-center justify-center transition-colors flex-shrink-0"
                                  title={social}
                                >
                                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                                  </svg>
                                </a>
                              ))}
                              {company.perSourceResult.socials.length > 3 && (
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-muted/50 flex items-center justify-center text-[10px] font-medium">
                                  +{company.perSourceResult.socials.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all flex-shrink-0"
                        title="Send Email"
                      >
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {selectedCompany && (
          <div className={`${isMobileDevice ? "w-full fixed inset-0 z-50 bg-background flex flex-col" : "w-full lg:w-1/2 flex flex-col"} ${isMobileDevice ? "" : "border-t lg:border-t-0 lg:border-l border-border/50"} bg-background/80 backdrop-blur-sm`}>
            {/* Mobile Header with Close Button - Always visible on mobile, positioned below main header */}
            {isMobileDevice && (
              <div className="p-3 sm:p-4 border-b border-border/50 flex items-center justify-between flex-shrink-0 bg-background/95 backdrop-blur-sm sticky top-[56px] sm:top-[64px] z-50 shadow-sm">
                <h2 className="text-lg font-bold text-foreground">Company Details</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCompanyUrl(null)}
                  className="h-9 w-9 rounded-lg hover:bg-muted/80 transition-colors border-2 border-border shadow-sm flex items-center justify-center"
                  aria-label="Close company details"
                  title="Close"
                >
                  <X className="w-5 h-5 text-foreground" />
                </Button>
              </div>
            )}
            <div className={`p-3 sm:p-4 md:p-6 flex-1 flex flex-col min-h-0 ${isMobileDevice ? "overflow-y-auto pt-[65px] sm:pt-[128px]" : ""}`}>
              <div className="bg-card/95 backdrop-blur-sm border-2 border-border/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 flex-1 flex flex-col min-h-0 shadow-xl">
                {!isMobileDevice && (
                  <div className="flex items-center mb-4 sm:mb-6 flex-shrink-0">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex-1">
                      Company Details
                    </h2>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(selectedCompany.perSourceResult.response_id, 'positive')}
                        className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl transition-all ${
                          feedbackState.get(selectedCompany.perSourceResult.response_id || 0) === 'positive'
                            ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                            : 'hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                        title="Good fit"
                      >
                        <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(selectedCompany.perSourceResult.response_id, 'negative')}
                        className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl transition-all ${
                          feedbackState.get(selectedCompany.perSourceResult.response_id || 0) === 'negative'
                            ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                            : 'hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400'
                        }`}
                        title="Poor fit"
                      >
                        <ThumbsDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCompanyUrl(null)}
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl hover:bg-muted/50 transition-colors flex-shrink-0"
                        title="Close"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 pr-1 sm:pr-2">
                  {/* Company Header */}
                  <div className="p-4 sm:p-5 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-border/30">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 break-words">{selectedCompany.url.replace(/^https?:\/\/(www\.)?/, '')}</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm md:text-base leading-relaxed break-words">{selectedCompany.perSourceResult.summary}</p>
                  </div>

                  {/* Fit Score */}
                  <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/30 backdrop-blur-sm border border-border/30">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Fit Score</label>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex-1">
                        <div className="h-2.5 sm:h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              selectedCompany.perSourceResult.fit_score >= 80 
                                ? "bg-gradient-to-r from-green-500 to-green-400" 
                                : selectedCompany.perSourceResult.fit_score >= 60 
                                ? "bg-gradient-to-r from-yellow-500 to-yellow-400" 
                                : "bg-gradient-to-r from-red-500 to-red-400"
                            }`}
                            style={{ width: `${selectedCompany.perSourceResult.fit_score}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-xl sm:text-2xl font-bold">{selectedCompany.perSourceResult.fit_score.toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Social Links */}
                  {selectedCompany.perSourceResult.socials.length > 0 && (
                    <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/30 backdrop-blur-sm border border-border/30">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 sm:mb-3">Social Links</label>
                      <div className="space-y-2">
                        {selectedCompany.perSourceResult.socials.map((social, idx) => (
                          <a
                            key={idx}
                            href={social}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-card hover:bg-accent/50 border border-border/30 transition-all group"
                          >
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                              </svg>
                            </div>
                            <span className="text-xs sm:text-sm break-all text-primary group-hover:underline">{social}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contacts */}
                  {selectedCompany.perSourceResult.contacts.length > 0 && (
                    <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/30 backdrop-blur-sm border border-border/30">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 sm:mb-3">Contact Information</label>
                      <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-72 overflow-y-auto pr-1 sm:pr-2">
                        {selectedCompany.perSourceResult.contacts.map((contact, idx) => (
                          <div key={idx} className="p-3 sm:p-4 rounded-lg bg-card border border-border/30 hover:border-primary/30 transition-all">
                            {contact.name && (
                              <div className="mb-2">
                                <span className="text-xs text-muted-foreground font-medium">Name</span>
                                <p className="text-xs sm:text-sm font-semibold break-words">{contact.name}</p>
                              </div>
                            )}
                            {contact.designation && (
                              <div className="mb-2">
                                <span className="text-xs text-muted-foreground font-medium">Role</span>
                                <p className="text-xs sm:text-sm break-words">{contact.designation}</p>
                              </div>
                            )}
                            {contact.email && (
                              <div className="mb-2">
                                <span className="text-xs text-muted-foreground font-medium">Email</span>
                                <a href={`mailto:${contact.email}`} className="text-xs sm:text-sm text-primary hover:underline break-all block">{contact.email}</a>
                              </div>
                            )}
                            {contact.phone && (
                              <div>
                                <span className="text-xs text-muted-foreground font-medium">Phone</span>
                                <a href={`tel:${contact.phone}`} className="text-xs sm:text-sm text-primary hover:underline break-all block">{contact.phone}</a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-2 flex-shrink-0">
                    {isMobileDevice && (
                      <div className="flex items-center gap-2 mb-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback(selectedCompany.perSourceResult.response_id, 'positive')}
                          className={`flex-1 h-9 rounded-lg transition-all ${
                            feedbackState.get(selectedCompany.perSourceResult.response_id || 0) === 'positive'
                              ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                              : 'hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400'
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4 mr-2" />
                          Good fit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback(selectedCompany.perSourceResult.response_id, 'negative')}
                          className={`flex-1 h-9 rounded-lg transition-all ${
                            feedbackState.get(selectedCompany.perSourceResult.response_id || 0) === 'negative'
                              ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                              : 'hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400'
                          }`}
                        >
                          <ThumbsDown className="w-4 h-4 mr-2" />
                          Poor fit
                        </Button>
                      </div>
                    )}
                    <Button 
                      className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground py-3 sm:py-4 rounded-lg sm:rounded-xl flex items-center justify-center gap-2 sm:gap-3 shadow-lg hover:shadow-xl transition-all font-semibold text-sm sm:text-base disabled:opacity-50"
                      disabled={emailLoading}
                      onClick={async (e) => {
                        e.stopPropagation()
                        const emails = selectedCompany!.perSourceResult.contacts.map(c => c.email).filter(Boolean)
                        if (emails.length === 0) {
                          setShowPopup(true)
                          return
                        }
                        setEmailLoading(true)
                        try {
                          const token = localStorage.getItem('access_token')
                          const response = await fetch('https://out-reach.duckdns.org:8000/generate_email', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                              query_id: parseInt(queryId!),
                              summary: selectedCompany!.perSourceResult.summary
                            })
                          })
                          if (response.ok) {
                            const data = await response.json()
                            const to = emails.join(',')
                            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`
                            window.open(gmailUrl, '_blank')
                          } else {
                            alert('Error generating email')
                          }
                        } catch (error) {
                          console.error(error)
                          alert('Error generating email')
                        } finally {
                          setEmailLoading(false)
                        }
                      }}
                    >
                      {emailLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Generating Email...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Generate & Send Email</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              No Email Found
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Unfortunately, no email addresses were found for this company. Try visiting their website directly or use the social links provided.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowPopup(false)} className="rounded-lg">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


