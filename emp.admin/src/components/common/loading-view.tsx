import React from 'react'

interface LoadingViewProps {
  message?: string
  className?: string
}

export const LoadingView: React.FC<LoadingViewProps> = ({
  message = 'Loading...',
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="text-gray-600">{message}</span>
      </div>
    </div>
  )
}