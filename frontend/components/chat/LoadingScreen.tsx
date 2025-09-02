"use client"

export function LoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
        <div className="text-xl font-medium mb-2">Processing your request...</div>
        <div className="text-gray-400">Our backend is analyzing your data</div>
      </div>
    </div>
  )
}


