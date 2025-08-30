'use client'

import * as React from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Navigation, type NavItem } from './navigation'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  items?: NavItem[]
  isOpen?: boolean
  onClose?: () => void
  className?: string
}

export function MobileNav({ items, className }: MobileNavProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleClose = () => setIsOpen(false)
  const handleToggle = () => setIsOpen(!isOpen)

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <div className={cn('md:hidden', className)}>
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        aria-label="Toggle mobile menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop - using button for proper accessibility */}
          <button
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm border-0 p-0 cursor-default"
            onClick={handleClose}
            aria-label="Close mobile menu"
          />
          
          {/* Menu Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-3/4 max-w-sm bg-background p-6 shadow-lg border-l">
            <div className="flex items-center justify-between mb-6">
              <Link href="/" className="flex items-center space-x-2" onClick={handleClose}>
                <div className="h-6 w-6 bg-primary rounded-md flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xs">SC</span>
                </div>
                <span className="font-bold text-lg text-foreground">
                  Scam Checker
                </span>
              </Link>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation Items */}
            <nav>
              <Navigation 
                items={items} 
                orientation="vertical"
                className="space-y-1"
              />
            </nav>
          </div>
        </>
      )}
    </div>
  )
}