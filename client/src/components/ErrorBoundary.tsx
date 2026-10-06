'use client'

'use client'

import React from 'react'
import i18n from '@/i18n/config'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: {
    children: React.ReactNode
    fallback?: React.ReactNode
  }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      // Class component: no hooks — read the initialized instance directly.
      return (
        this.props.fallback ?? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <h2 className="font-medium text-red-800">
              {i18n.t('errors.somethingWentWrong')}
            </h2>
            <p className="mt-1 text-sm text-red-600">
              {this.state.error?.message}
            </p>
          </div>
        )
      )
    }
    return this.props.children
  }
}
