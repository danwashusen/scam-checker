'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  NavigationMenu as NavigationMenuPrimitive,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'

interface NavItem {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  external?: boolean
  ariaLabel?: string
  children?: NavItem[]
}

const navigationItems: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: Home,
    ariaLabel: 'Go to homepage',
  },
  {
    label: 'API Docs',
    href: '/api-docs',
    icon: FileText,
    ariaLabel: 'View API documentation',
  },
  {
    label: 'About',
    href: '/about',
    icon: Info,
    ariaLabel: 'Learn about ScamChecker',
  },
]

interface NavigationMenuProps {
  items?: NavItem[]
  className?: string
  ariaLabel?: string
  orientation?: 'horizontal' | 'vertical'
}

export function NavigationMenu({
  items = navigationItems,
  className,
  ariaLabel = 'Main navigation',
  orientation: _orientation = 'horizontal'
}: NavigationMenuProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <NavigationMenuPrimitive 
      className={cn('z-50', className)} 
      aria-label={ariaLabel}
    >
      <NavigationMenuList>
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <NavigationMenuItem key={item.href}>
              {item.children ? (
                <>
                  <NavigationMenuTrigger
                    className={cn(
                      active && 'bg-accent text-accent-foreground'
                    )}
                  >
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    {item.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-6 w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                      {item.children.map((child) => (
                        <NavigationMenuLink key={child.href} asChild>
                          <Link
                            href={child.href}
                            className={cn(
                              'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                              isActive(child.href) && 'bg-accent text-accent-foreground'
                            )}
                            target={child.external ? '_blank' : undefined}
                            rel={child.external ? 'noopener noreferrer' : undefined}
                            aria-label={child.ariaLabel || child.label}
                          >
                            <div className="flex items-center">
                              {child.icon && <child.icon className="mr-2 h-4 w-4" />}
                              <div className="text-sm font-medium leading-none">
                                {child.label}
                              </div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </>
              ) : (
                <NavigationMenuLink asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50',
                      active 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground'
                    )}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    aria-label={item.ariaLabel || item.label}
                    aria-current={active ? 'page' : undefined}
                  >
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    {item.label}
                  </Link>
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>
    </NavigationMenuPrimitive>
  )
}

export { type NavItem, navigationItems }