'use client'

import * as React from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { navigationItems, type NavItem } from './navigation'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  items?: NavItem[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: 'left' | 'right'
  className?: string
}

export function MobileNav({
  items = navigationItems,
  open,
  onOpenChange,
  side = 'right',
  className
}: MobileNavProps) {
  const pathname = usePathname()
  const [internalOpen, setInternalOpen] = React.useState(false)
  
  // Use controlled or uncontrolled state
  const isOpen = open !== undefined ? open : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const handleLinkClick = () => {
    setOpen(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          aria-label="Open navigation menu"
          className={cn('md:hidden', className)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side={side} className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Main navigation menu
          </SheetDescription>
        </SheetHeader>
        
        {/* Logo */}
        <div className="flex items-center space-x-2 mt-4 mb-8">
          <Link 
            href="/" 
            className="flex items-center space-x-2" 
            onClick={handleLinkClick}
          >
            <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SC</span>
            </div>
            <span className="font-bold text-xl text-foreground">
              Scam Checker
            </span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-4 mt-8" role="navigation">
          {items.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 text-lg font-medium p-3 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none',
                  active 
                    ? 'bg-accent text-accent-foreground' 
                    : 'text-foreground'
                )}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                aria-label={item.ariaLabel || item.label}
                aria-current={active ? 'page' : undefined}
              >
                {Icon && <Icon className="h-5 w-5" />}
                {item.label}
              </Link>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

export { type MobileNavProps }