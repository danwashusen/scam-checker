'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  external?: boolean
}

const navigationItems: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: Home,
  },
  {
    label: 'API Docs',
    href: '/api-docs',
    icon: FileText,
  },
  {
    label: 'About',
    href: '/about',
    icon: Info,
  },
]

interface NavigationProps {
  items?: NavItem[]
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function Navigation({ 
  items = navigationItems, 
  className, 
  orientation = 'horizontal' 
}: NavigationProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className={cn(
      'flex',
      orientation === 'horizontal' ? 'items-center space-x-6' : 'flex-col space-y-2',
      className
    )}>
      {items.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center text-sm font-medium transition-colors hover:text-primary',
              active 
                ? 'text-foreground' 
                : 'text-muted-foreground',
              orientation === 'vertical' && 'px-3 py-2 rounded-md hover:bg-accent'
            )}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noopener noreferrer' : undefined}
          >
            {Icon && (
              <Icon className={cn(
                'h-4 w-4',
                orientation === 'horizontal' ? 'mr-2' : 'mr-3'
              )} />
            )}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export { type NavItem, navigationItems }