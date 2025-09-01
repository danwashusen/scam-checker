import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultsDisplay } from '@/components/analysis/results-display'
import { createMockAnalysisResult } from '../../../utils/mock-data'
// Test file for ResultsDisplay component

// Mock the child components to isolate testing
jest.mock('@/components/analysis/simple-view', () => ({
  SimpleView: ({ onViewDetails }: { onViewDetails?: () => void }) => (
    <div data-testid="simple-view">
      Simple View
      {onViewDetails && (
        <button onClick={onViewDetails} data-testid="view-details-button">
          View Details
        </button>
      )}
    </div>
  )
}))

jest.mock('@/components/analysis/technical-details', () => ({
  TechnicalDetails: () => <div data-testid="technical-view">Technical View</div>
}))

jest.mock('@/components/analysis/share-export', () => ({
  ShareExport: ({ onShare, onExport }: { onShare?: (method: string) => void; onExport?: (format: string) => void }) => (
    <div data-testid="share-export">
      <button onClick={() => onShare?.('link')} data-testid="share-button">Share</button>
      <button onClick={() => onExport?.('pdf')} data-testid="export-button">Export</button>
    </div>
  )
}))

describe('ResultsDisplay', () => {
  const mockResult = createMockAnalysisResult()
  
  describe('loading state', () => {
    test('displays loading skeleton when isLoading is true', () => {
      render(<ResultsDisplay result={null} isLoading={true} />)
      
      // Should show skeleton elements
      expect(screen.getAllByRole('generic', { hidden: true })).toHaveLength(0) // Skeletons don't have explicit roles
      // Check for loading indicators by structure
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    test('does not display result content when loading', () => {
      render(<ResultsDisplay result={mockResult} isLoading={true} />)
      
      expect(screen.queryByTestId('simple-view')).not.toBeInTheDocument()
      expect(screen.queryByTestId('technical-view')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    test('displays error message when error is provided', () => {
      const error = new Error('Analysis failed')
      render(<ResultsDisplay result={null} isLoading={false} error={error} />)
      
      expect(screen.getByText('Analysis Failed')).toBeInTheDocument()
      expect(screen.getByText('Analysis failed')).toBeInTheDocument()
    })

    test('shows retry button when onRetry is provided', () => {
      const error = new Error('Test error')
      const onRetry = jest.fn()
      
      render(
        <ResultsDisplay 
          result={null} 
          isLoading={false} 
          error={error} 
          onRetry={onRetry}
        />
      )
      
      const retryButton = screen.getByText('Retry Analysis')
      expect(retryButton).toBeInTheDocument()
      
      fireEvent.click(retryButton)
      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    test('shows analyze new button when onAnalyzeNew is provided', () => {
      const error = new Error('Test error')
      const onAnalyzeNew = jest.fn()
      
      render(
        <ResultsDisplay 
          result={null} 
          isLoading={false} 
          error={error} 
          onAnalyzeNew={onAnalyzeNew}
        />
      )
      
      const analyzeButton = screen.getByText('Analyze New URL')
      expect(analyzeButton).toBeInTheDocument()
      
      fireEvent.click(analyzeButton)
      expect(onAnalyzeNew).toHaveBeenCalledTimes(1)
    })
  })

  describe('no result state', () => {
    test('displays no results message when result is null and not loading', () => {
      render(<ResultsDisplay result={null} isLoading={false} />)
      
      expect(screen.getByText('No analysis results to display')).toBeInTheDocument()
      expect(screen.getByText('Enter a URL above to begin security analysis')).toBeInTheDocument()
    })
  })

  describe('successful result display', () => {
    test('displays result content when result is provided', () => {
      render(<ResultsDisplay result={mockResult} isLoading={false} />)
      
      expect(screen.getByText('URL Security Report')).toBeInTheDocument()
      expect(screen.getByTestId('simple-view')).toBeInTheDocument()
    })

    test('switches between simple and technical views', async () => {
      const user = userEvent.setup()
      render(<ResultsDisplay result={mockResult} isLoading={false} />)
      
      // Initially shows simple view
      expect(screen.getByTestId('simple-view')).toBeInTheDocument()
      expect(screen.queryByTestId('technical-view')).not.toBeInTheDocument()
      
      // Click technical tab
      const technicalTab = screen.getByRole('tab', { name: /technical/i })
      await user.click(technicalTab)
      
      // Should show technical view
      await waitFor(() => {
        expect(screen.queryByTestId('simple-view')).not.toBeInTheDocument()
        expect(screen.getByTestId('technical-view')).toBeInTheDocument()
      })
    })

    test('can switch to technical view via simple view button', async () => {
      const user = userEvent.setup()
      render(<ResultsDisplay result={mockResult} isLoading={false} />)
      
      // Click "View Details" button in simple view
      const viewDetailsButton = screen.getByTestId('view-details-button')
      await user.click(viewDetailsButton)
      
      // Should switch to technical view
      await waitFor(() => {
        expect(screen.getByTestId('technical-view')).toBeInTheDocument()
      })
    })

    test('displays share/export component', () => {
      render(<ResultsDisplay result={mockResult} isLoading={false} />)
      
      expect(screen.getByTestId('share-export')).toBeInTheDocument()
    })

    test('handles share callback', () => {
      const onShare = jest.fn()
      render(
        <ResultsDisplay 
          result={mockResult} 
          isLoading={false} 
          onShare={onShare}
        />
      )
      
      const shareButton = screen.getByTestId('share-button')
      fireEvent.click(shareButton)
      
      expect(onShare).toHaveBeenCalledWith('link')
    })

    test('handles export callback', () => {
      const onExport = jest.fn()
      render(
        <ResultsDisplay 
          result={mockResult} 
          isLoading={false} 
          onExport={onExport}
        />
      )
      
      const exportButton = screen.getByTestId('export-button')
      fireEvent.click(exportButton)
      
      expect(onExport).toHaveBeenCalledWith('pdf')
    })

    test('shows analyze new button in header when provided', () => {
      const onAnalyzeNew = jest.fn()
      render(
        <ResultsDisplay 
          result={mockResult} 
          isLoading={false} 
          onAnalyzeNew={onAnalyzeNew}
        />
      )
      
      const analyzeButton = screen.getByText('Check Another URL')
      expect(analyzeButton).toBeInTheDocument()
      
      fireEvent.click(analyzeButton)
      expect(onAnalyzeNew).toHaveBeenCalledTimes(1)
    })
  })

  describe('createMockAnalysisResult', () => {
    test('creates valid mock data with defaults', () => {
      const result = createMockAnalysisResult()
      
      expect(result.url).toBe('https://example.com')
      expect(result.score).toBe(85)
      expect(result.status).toBe('safe')
      expect(result.confidence).toBe(0.92)
      expect(result.findings).toHaveLength(3)
      expect(result.technicalData).toBeDefined()
    })

    test('allows overriding default values', () => {
      const result = createMockAnalysisResult({
        url: 'https://test.com',
        score: 45,
        status: 'caution'
      })
      
      expect(result.url).toBe('https://test.com')
      expect(result.score).toBe(45)
      expect(result.status).toBe('caution')
      // Other values should remain default
      expect(result.confidence).toBe(0.92)
    })
  })

  describe('error boundary', () => {
    // Note: Testing error boundaries in React Testing Library is complex
    // This would typically be tested in integration tests or with specialized error boundary testing utilities
    test('component renders without crashing with valid props', () => {
      expect(() => {
        render(<ResultsDisplay result={mockResult} isLoading={false} />)
      }).not.toThrow()
    })
  })
})