import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { MobileNav } from '@/components/layout/mobile-nav'

expect.extend(toHaveNoViolations)

// Mock Next.js usePathname hook
jest.mock('next/navigation', () => ({
  usePathname: () => '/'
}))

// Mock toast hook
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    showToast: jest.fn()
  })
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
]

describe('MobileNav', () => {
  // Accessibility tests
  it('should have no accessibility violations when closed', async () => {
    const { container } = render(<MobileNav items={mockItems} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have no accessibility violations when open', async () => {
    const { container } = render(<MobileNav items={mockItems} open={true} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  // Component rendering tests
  it('should render hamburger menu trigger', () => {
    render(<MobileNav items={mockItems} />)
    
    const trigger = screen.getByRole('button', { name: 'Open navigation menu' })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveClass('md:hidden')
  })

  it('should render navigation items when open', () => {
    render(<MobileNav items={mockItems} open={true} />)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to homepage' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View API documentation' })).toBeInTheDocument()
  })

  // Interaction tests
  it('should open when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<MobileNav items={mockItems} />)
    
    const trigger = screen.getByRole('button', { name: 'Open navigation menu' })
    await user.click(trigger)
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it.skip('should close when overlay is clicked', async () => {
    const user = userEvent.setup()
    const mockOnOpenChange = jest.fn()
    render(
      <MobileNav 
        items={mockItems} 
        open={true} 
        onOpenChange={mockOnOpenChange}
      />
    )
    
    const overlay = screen.getByTestId('sheet-overlay') || screen.getByRole('dialog').parentElement
    if (overlay) {
      await user.click(overlay)
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    }
  })

  it('should close when navigation link is clicked', async () => {
    const user = userEvent.setup()
    const mockOnOpenChange = jest.fn()
    render(
      <MobileNav 
        items={mockItems} 
        open={true} 
        onOpenChange={mockOnOpenChange}
      />
    )
    
    const homeLink = screen.getByRole('link', { name: 'Go to homepage' })
    await user.click(homeLink)
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  // Keyboard navigation tests
  it('should close when ESC key is pressed', async () => {
    const user = userEvent.setup()
    const mockOnOpenChange = jest.fn()
    render(
      <MobileNav 
        items={mockItems} 
        open={true} 
        onOpenChange={mockOnOpenChange}
      />
    )
    
    await user.keyboard('{Escape}')
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  // Active state tests
  it('should highlight active navigation item', () => {
    render(<MobileNav items={mockItems} open={true} />)
    
    const homeLink = screen.getByRole('link', { name: 'Go to homepage' })
    expect(homeLink).toHaveAttribute('aria-current', 'page')
    expect(homeLink).toHaveClass('bg-accent', 'text-accent-foreground')
  })

  // Accessibility attributes tests
  it('should have proper ARIA attributes', () => {
    render(<MobileNav items={mockItems} open={true} />)
    
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    
    const title = screen.getByText('Navigation')
    expect(title).toBeInTheDocument()
    
    // Check navigation role
    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
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
    
    render(<MobileNav items={externalItems} open={true} />)
    
    const externalLink = screen.getByRole('link', { name: 'Visit external site' })
    expect(externalLink).toHaveAttribute('target', '_blank')
    expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  // Controlled vs uncontrolled behavior
  it('should work in controlled mode', () => {
    const mockOnOpenChange = jest.fn()
    const { rerender } = render(
      <MobileNav 
        items={mockItems} 
        open={false} 
        onOpenChange={mockOnOpenChange}
      />
    )
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    
    rerender(
      <MobileNav 
        items={mockItems} 
        open={true} 
        onOpenChange={mockOnOpenChange}
      />
    )
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})