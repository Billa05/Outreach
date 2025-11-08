"use client"

import { useState, useEffect } from "react"

const loadingSteps = [
  { message: "Searching the web for relevant companies...", icon: "🔍" },
  { message: "Analyzing website content...", icon: "📄" },
  { message: "Extracting contact information...", icon: "👥" },
  { message: "Scoring leads for relevance...", icon: "🎯" },
  { message: "Almost ready...", icon: "✨" },
]

export function LoadingScreen() {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % loadingSteps.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="text-center relative z-10 max-w-md">
        {/* Animated spinner */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-primary border-r-primary rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-4 border-primary/20 rounded-full animate-ping"></div>
        </div>

        {/* Step indicator */}
        <div className="mb-6 text-4xl animate-bounce">
          {loadingSteps[currentStep].icon}
        </div>

        {/* Loading message */}
        <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Processing Your Request
        </h2>
        <p className="text-lg text-muted-foreground mb-8 transition-all duration-500 min-h-[28px]">
          {loadingSteps[currentStep].message}
        </p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {loadingSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Tip */}
        <div className="p-4 rounded-lg bg-muted/30 backdrop-blur-sm border border-border/50">
          <p className="text-sm text-muted-foreground">
            💡 <span className="font-medium">Tip:</span> We're crawling multiple websites to find the best matches for your query
          </p>
        </div>
      </div>
    </div>
  )
}


