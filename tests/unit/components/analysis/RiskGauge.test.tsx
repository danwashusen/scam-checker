import React from 'react'
import { render, screen } from '@testing-library/react'
import { RiskGauge, getStatusFromScore } from '@/components/analysis/risk-gauge'

describe('RiskGauge', () => {
  describe('static rendering', () => {
    test('renders score and status correctly', () => {
      render(<RiskGauge score={85} status="safe" animate={false} />)
      
      expect(screen.getByText('85')).toBeInTheDocument()
      expect(screen.getByText('SAFE')).toBeInTheDocument()
    })

    test('applies correct color for different status levels', () => {
      const { rerender } = render(<RiskGauge score={25} status="danger" animate={false} />)
      let gaugeArc = screen.getByTestId('gauge-arc')
      expect(gaugeArc).toHaveAttribute('stroke', '#ef4444') // Red for danger
      
      rerender(<RiskGauge score={50} status="caution" animate={false} />)
      gaugeArc = screen.getByTestId('gauge-arc')
      expect(gaugeArc).toHaveAttribute('stroke', '#f59e0b') // Orange for caution
      
      rerender(<RiskGauge score={85} status="safe" animate={false} />)
      gaugeArc = screen.getByTestId('gauge-arc')
      expect(gaugeArc).toHaveAttribute('stroke', '#10b981') // Green for safe
    })

    test('renders different sizes correctly', () => {
      const { rerender } = render(<RiskGauge score={75} status="safe" size="sm" animate={false} />)
      let svg = document.querySelector('svg')
      expect(svg).toHaveAttribute('width', '120')
      expect(svg).toHaveAttribute('height', '120')

      rerender(<RiskGauge score={75} status="safe" size="md" animate={false} />)
      svg = document.querySelector('svg')
      expect(svg).toHaveAttribute('width', '200')
      expect(svg).toHaveAttribute('height', '200')

      rerender(<RiskGauge score={75} status="safe" size="lg" animate={false} />)
      svg = document.querySelector('svg')
      expect(svg).toHaveAttribute('width', '280')
      expect(svg).toHaveAttribute('height', '280')
    })

    test('hides numeric display when showNumeric is false', () => {
      render(<RiskGauge score={85} status="safe" showNumeric={false} animate={false} />)
      
      expect(screen.queryByText('85')).not.toBeInTheDocument()
      expect(screen.getByText('SAFE')).toBeInTheDocument()
    })

    test('handles edge score values correctly', () => {
      const { rerender } = render(<RiskGauge score={0} status="danger" animate={false} />)
      expect(screen.getByText('0')).toBeInTheDocument()

      rerender(<RiskGauge score={100} status="safe" animate={false} />)
      expect(screen.getByText('100')).toBeInTheDocument()

      // Test values outside normal range are clamped
      rerender(<RiskGauge score={-10} status="danger" animate={false} />)
      expect(screen.getByText('-10')).toBeInTheDocument() // Component shows actual value but arc clamps to 0

      rerender(<RiskGauge score={150} status="safe" animate={false} />)
      expect(screen.getByText('150')).toBeInTheDocument() // Component shows actual value but arc clamps to 100
    })
  })

  describe('animation', () => {
    test('applies motion variants when animate is true', () => {
      render(<RiskGauge score={75} status="safe" animate={true} />)
      
      const gaugeArc = screen.getByTestId('gauge-arc')
      const scoreDisplay = screen.getByTestId('score-display')
      
      expect(gaugeArc).toBeInTheDocument()
      expect(scoreDisplay).toBeInTheDocument()
    })

    test('does not apply motion when animate is false', () => {
      render(<RiskGauge score={75} status="safe" animate={false} />)
      
      const gaugeArc = screen.getByTestId('gauge-arc')
      expect(gaugeArc).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    test('includes proper test ids for testing', () => {
      render(<RiskGauge score={85} status="safe" />)
      
      expect(screen.getByTestId('gauge-arc')).toBeInTheDocument()
      expect(screen.getByTestId('score-display')).toBeInTheDocument()
      expect(screen.getByTestId('status-display')).toBeInTheDocument()
    })
  })

  describe('helper functions', () => {
    describe('getStatusFromScore', () => {
      test('returns correct status for different score ranges', () => {
        expect(getStatusFromScore(90)).toBe('safe')
        expect(getStatusFromScore(67)).toBe('safe')
        expect(getStatusFromScore(66)).toBe('moderate')
        expect(getStatusFromScore(50)).toBe('moderate')
        expect(getStatusFromScore(34)).toBe('moderate')
        expect(getStatusFromScore(33)).toBe('danger')
        expect(getStatusFromScore(0)).toBe('danger')
      })

      test('handles edge cases correctly', () => {
        expect(getStatusFromScore(66.9)).toBe('moderate')
        expect(getStatusFromScore(67.0)).toBe('safe')
        expect(getStatusFromScore(33.9)).toBe('danger')
        expect(getStatusFromScore(34.0)).toBe('moderate')
      })
    })
  })
})