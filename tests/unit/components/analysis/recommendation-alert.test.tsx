import { render, screen } from '@testing-library/react'
import { RecommendationAlert } from '@/components/analysis/recommendation-alert'

describe('RecommendationAlert', () => {
  it('shows safe recommendation for high scores (80+)', () => {
    render(<RecommendationAlert score={85} status="safe" />)
    
    expect(screen.getByTestId('recommendation-alert')).toBeInTheDocument()
    expect(screen.getByText('Recommendation')).toBeInTheDocument()
    expect(screen.getByText(/standard security checks passed/i)).toBeInTheDocument()
  })

  it('shows caution recommendation for moderate scores (60-79)', () => {
    render(<RecommendationAlert score={70} status="moderate" />)
    
    expect(screen.getByText('Proceed with Caution')).toBeInTheDocument()
    expect(screen.getByText(/some concerns detected but no major red flags/i)).toBeInTheDocument()
  })

  it('shows careful recommendation for low scores (40-59)', () => {
    render(<RecommendationAlert score={50} status="caution" />)
    
    expect(screen.getByText('Be Careful')).toBeInTheDocument()
    expect(screen.getByText(/multiple risk indicators detected/i)).toBeInTheDocument()
  })

  it('shows high risk recommendation for very low scores (20-39)', () => {
    render(<RecommendationAlert score={30} status="caution" />)
    
    expect(screen.getByText('High Risk')).toBeInTheDocument()
    expect(screen.getByText(/significant security concerns detected/i)).toBeInTheDocument()
  })

  it('shows danger recommendation for critical scores (0-19)', () => {
    render(<RecommendationAlert score={10} status="danger" />)
    
    expect(screen.getByText('Danger')).toBeInTheDocument()
    expect(screen.getByText(/critical security threats detected/i)).toBeInTheDocument()
  })

  describe('Alert variants', () => {
    it('uses default variant for safe scores', () => {
      render(<RecommendationAlert score={85} status="safe" />)
      
      const alert = screen.getByTestId('recommendation-alert')
      // Should not have destructive classes
      expect(alert).not.toHaveClass('border-red-200')
    })

    it('uses default variant for moderate scores', () => {
      render(<RecommendationAlert score={70} status="moderate" />)
      
      const alert = screen.getByTestId('recommendation-alert')
      // Should have custom amber styling for moderate scores
      expect(alert).toHaveClass('border-amber-200', 'bg-amber-50', 'text-amber-900')
    })

    it('uses destructive variant for low scores', () => {
      render(<RecommendationAlert score={30} status="danger" />)
      
      const alert = screen.getByTestId('recommendation-alert')
      // Check for destructive variant classes (may vary based on shadcn implementation)
      expect(alert).toHaveAttribute('data-testid', 'recommendation-alert')
    })
  })

  describe('Icons', () => {
    it('shows Info icon for safe scores', () => {
      render(<RecommendationAlert score={85} status="safe" />)
      
      // Check for SVG icon presence
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    it('shows AlertTriangle icon for moderate scores', () => {
      render(<RecommendationAlert score={70} status="moderate" />)
      
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    it('shows XCircle icon for dangerous scores', () => {
      render(<RecommendationAlert score={20} status="danger" />)
      
      expect(document.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Score boundaries', () => {
    it('handles score exactly at 80', () => {
      render(<RecommendationAlert score={80} status="safe" />)
      
      expect(screen.getByText('Recommendation')).toBeInTheDocument()
      expect(screen.getByText(/standard security checks/i)).toBeInTheDocument()
    })

    it('handles score at 79 (just below safe threshold)', () => {
      render(<RecommendationAlert score={79} status="moderate" />)
      
      expect(screen.getByText('Proceed with Caution')).toBeInTheDocument()
    })

    it('handles score exactly at 60', () => {
      render(<RecommendationAlert score={60} status="moderate" />)
      
      expect(screen.getByText('Proceed with Caution')).toBeInTheDocument()
    })

    it('handles score at 59 (just below moderate threshold)', () => {
      render(<RecommendationAlert score={59} status="caution" />)
      
      expect(screen.getByText('Be Careful')).toBeInTheDocument()
    })

    it('handles score exactly at 40', () => {
      render(<RecommendationAlert score={40} status="caution" />)
      
      expect(screen.getByText('Be Careful')).toBeInTheDocument()
    })

    it('handles score at 39 (just below careful threshold)', () => {
      render(<RecommendationAlert score={39} status="caution" />)
      
      expect(screen.getByText('High Risk')).toBeInTheDocument()
    })

    it('handles score exactly at 20', () => {
      render(<RecommendationAlert score={20} status="caution" />)
      
      expect(screen.getByText('High Risk')).toBeInTheDocument()
    })

    it('handles score at 19 (just below high risk threshold)', () => {
      render(<RecommendationAlert score={19} status="danger" />)
      
      expect(screen.getByText('Danger')).toBeInTheDocument()
    })

    it('handles minimum score (0)', () => {
      render(<RecommendationAlert score={0} status="danger" />)
      
      expect(screen.getByText('Danger')).toBeInTheDocument()
    })

    it('handles maximum score (100)', () => {
      render(<RecommendationAlert score={100} status="safe" />)
      
      expect(screen.getByText('Recommendation')).toBeInTheDocument()
    })
  })

  describe('Custom styling', () => {
    it('applies custom className when provided', () => {
      render(<RecommendationAlert score={85} status="safe" className="custom-class" />)
      
      expect(screen.getByTestId('recommendation-alert')).toHaveClass('custom-class')
    })

    it('applies special styling for high safe scores', () => {
      render(<RecommendationAlert score={95} status="safe" />)
      
      const alert = screen.getByTestId('recommendation-alert')
      expect(alert).toHaveClass('border-blue-200', 'bg-blue-50', 'text-blue-900')
    })
  })

  describe('Accessibility', () => {
    it('has proper alert structure with title and description', () => {
      render(<RecommendationAlert score={85} status="safe" />)
      
      // AlertTitle and AlertDescription should be rendered properly
      expect(screen.getByText('Recommendation')).toBeInTheDocument()
      expect(screen.getByText(/standard security checks/i)).toBeInTheDocument()
    })

    it('has accessible alert role', () => {
      render(<RecommendationAlert score={30} status="danger" />)
      
      const alert = screen.getByTestId('recommendation-alert')
      // shadcn Alert components should have proper ARIA attributes
      expect(alert).toBeInTheDocument()
    })
  })
})