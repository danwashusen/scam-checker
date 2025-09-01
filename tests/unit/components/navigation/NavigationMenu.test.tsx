import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { NavigationMenu } from '@/components/layout/navigation'

expect.extend(toHaveNoViolations)

// Mock Next.js usePathname hook
jest.mock('next/navigation', () => ({
  usePathname: () => '/'
}))

const mockItems = [
  {
    label: 'Home',
    href: '/',
    ariaLabel: 'Go to homepage',
  },
  {
    label: 'API Docs',
    href: '/api-docs',
    ariaLabel: 'View API documentation',
  },
  {
    label: 'About',
    href: '/about',
    ariaLabel: 'Learn about ScamChecker',
  },
]

describe('NavigationMenu', () => {
  // Accessibility tests
  it('should have no accessibility violations', async () => {
    const { container } = render(<NavigationMenu items={mockItems} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  // Component rendering tests
  it('should render all navigation items', () => {
    render(<NavigationMenu items={mockItems} />)
    
    expect(screen.getByRole('link', { name: 'Go to homepage' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View API documentation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Learn about ScamChecker' })).toBeInTheDocument()
  })

  // Keyboard navigation tests
  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<NavigationMenu items={mockItems} />)
    
    const firstLink = screen.getByRole('link', { name: 'Go to homepage' })
    const secondLink = screen.getByRole('link', { name: 'View API documentation' })
    
    // Focus first link
    await user.tab()
    expect(firstLink).toHaveFocus()
    
    // Tab to second link
    await user.tab()
    expect(secondLink).toHaveFocus()
  })

  // Active state tests
  it('should highlight active navigation item', () => {
    render(<NavigationMenu items={mockItems} />)
    
    const homeLink = screen.getByRole('link', { name: 'Go to homepage' })
    expect(homeLink).toHaveAttribute('aria-current', 'page')
    expect(homeLink).toHaveClass('bg-accent', 'text-accent-foreground')
  })

  // Accessibility attributes tests
  it('should have proper ARIA attributes', () => {
    render(<NavigationMenu items={mockItems} ariaLabel="Test navigation" />)
    
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('aria-label', 'Test navigation')
    
    // Check each link has proper attributes
    mockItems.forEach(item => {
      const link = screen.getByRole('link', { name: item.ariaLabel })
      expect(link).toHaveAttribute('aria-label', item.ariaLabel)
    })
  })

  // Component structure tests
  it.skip('should render with custom className', () => {
    const { container } = render(
      <NavigationMenu items={mockItems} className="custom-nav" />
    )
    
    const nav = container.querySelector('[role="navigation"]')
    expect(nav).toHaveClass('custom-nav')
  })

  // External link handling
  it('should handle external links correctly', () => {
    const externalItems = [
      {
        label: 'External',
        href: 'https://example.com',
        external: true,
        ariaLabel: 'Visit external site',
      },
    ]
    
    render(<NavigationMenu items={externalItems} />)
    
    const externalLink = screen.getByRole('link', { name: 'Visit external site' })
    expect(externalLink).toHaveAttribute('target', '_blank')
    expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer')
  })
})