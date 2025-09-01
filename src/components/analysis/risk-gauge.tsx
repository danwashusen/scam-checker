"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface RiskGaugeProps {
  score: number
  status: 'safe' | 'moderate' | 'caution' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
  showNumeric?: boolean
  className?: string
}

// Color mapping for different risk levels
const statusColors = {
  danger: '#ef4444',   // Red for 0-33
  caution: '#f59e0b',  // Orange/amber for 34-66
  moderate: '#f59e0b', // Orange/amber for 34-66
  safe: '#10b981'      // Green for 67-100
}

// Size configurations
const sizeConfigs = {
  sm: {
    diameter: 120,
    strokeWidth: 8,
    fontSize: '24px',
    statusFontSize: '12px'
  },
  md: {
    diameter: 200,
    strokeWidth: 12,
    fontSize: '48px',
    statusFontSize: '18px'
  },
  lg: {
    diameter: 280,
    strokeWidth: 16,
    fontSize: '64px',
    statusFontSize: '24px'
  }
}

export function RiskGauge({
  score,
  status,
  size = 'md',
  animate = true,
  showNumeric = true,
  className
}: RiskGaugeProps) {
  const config = sizeConfigs[size]
  const radius = (config.diameter - config.strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  
  // Calculate the stroke dash offset based on score
  const progress = Math.max(0, Math.min(100, score)) / 100
  const strokeDashoffset = circumference * (1 - progress)
  
  // Get color for current status
  const strokeColor = statusColors[status]
  
  // Animation variants for Framer Motion
  const svgVariants = {
    initial: { 
      strokeDashoffset: circumference,
      opacity: 0.8
    },
    animate: { 
      strokeDashoffset: strokeDashoffset,
      opacity: 1,
      transition: {
        duration: 1.5,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }
  
  const numberVariants = {
    initial: { 
      scale: 0.8,
      opacity: 0
    },
    animate: { 
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.5,
        delay: 0.5,
        ease: [0.34, 1.56, 0.64, 1]
      }
    }
  }
  
  const statusText = status.toUpperCase()
  
  return (
    <div 
      role="meter"
      aria-label={`Risk score: ${score} out of 100, status: ${status}`}
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-describedby={`gauge-description-${status}`}
      className={cn(
        "relative flex items-center justify-center",
        className
      )}
    >
      <svg 
        width={config.diameter} 
        height={config.diameter}
        className="transform -rotate-90"
        role="img"
        aria-hidden="true"
      >
        {/* Background ring */}
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={config.strokeWidth}
          fill="none"
          className="opacity-20"
        />
        
        {/* Animated progress ring */}
        <motion.circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={config.strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          variants={animate ? svgVariants : undefined}
          initial={animate ? "initial" : undefined}
          animate={animate ? "animate" : undefined}
          style={{
            strokeDashoffset: animate ? undefined : strokeDashoffset
          }}
          data-testid="gauge-arc"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showNumeric && (
          <motion.span
            className="font-bold text-foreground"
            style={{ fontSize: config.fontSize }}
            variants={animate ? numberVariants : undefined}
            initial={animate ? "initial" : undefined}
            animate={animate ? "animate" : undefined}
            data-testid="score-display"
          >
            {score}
          </motion.span>
        )}
        
        <motion.span
          className="uppercase font-medium tracking-wider text-muted-foreground"
          style={{ 
            fontSize: config.statusFontSize,
            color: strokeColor
          }}
          variants={animate ? numberVariants : undefined}
          initial={animate ? "initial" : undefined}
          animate={animate ? "animate" : undefined}
          data-testid="status-display"
        >
          {statusText}
        </motion.span>
      </div>
      
      {/* Hidden description for screen readers */}
      <div 
        id={`gauge-description-${status}`}
        className="sr-only"
      >
        {status === 'safe' && 'This website appears safe to visit based on our security analysis.'}
        {status === 'moderate' && 'This website has some minor concerns but is generally safe with normal precautions.'}
        {status === 'caution' && 'This website has multiple risk indicators. Exercise caution before visiting.'}
        {status === 'danger' && 'This website poses significant security risks. We recommend avoiding it.'}
      </div>
    </div>
  )
}

// Helper function to determine status from score
// CORRECTED: Now properly maps safety scores to status
export function getStatusFromScore(score: number): 'safe' | 'moderate' | 'caution' | 'danger' {
  if (score >= 67) return 'safe'      // 67-100 = SAFE (Green)
  if (score >= 34) return 'caution'   // 34-66 = CAUTION (Orange)  
  return 'danger'                     // 0-33 = DANGER (Red)
}