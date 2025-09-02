import { test as base, Page } from '@playwright/test'
import { TestUser } from '../types/test-types'

/**
 * Authentication fixture for future auth implementation
 * Currently provides mock auth state management for testing
 */

// Mock users for testing
const testUsers: Record<string, TestUser> = {
  basicUser: {
    id: 'user-001',
    name: 'Test User',
    email: 'test@example.com',
    preferences: {
      view: 'simple',
      notifications: true
    }
  },
  
  techUser: {
    id: 'user-002',
    name: 'Technical User',
    email: 'tech@example.com',
    preferences: {
      view: 'technical',
      notifications: false
    }
  },
  
  adminUser: {
    id: 'admin-001',
    name: 'Admin User',
    email: 'admin@example.com',
    preferences: {
      view: 'technical',
      notifications: true
    }
  }
}

// Auth fixture implementation
export const authFixture = base.extend({
  // Mock authentication state
  authenticatedUser: async ({ page }, use) => {
    const loginAs = async (testPage: Page, userType: keyof typeof testUsers = 'basicUser') => {
      const user = testUsers[userType]
      
      // Mock auth state in localStorage (common pattern)
      await testPage.addInitScript((userData) => {
        localStorage.setItem('auth', JSON.stringify({
          user: userData,
          token: 'mock-jwt-token',
          expiresAt: Date.now() + 3600000 // 1 hour from now
        }))
        
        localStorage.setItem('userPreferences', JSON.stringify(userData.preferences))
      }, user)
      
      // Mock auth API endpoints
      await testPage.route('/api/auth/**', async (route) => {
        const url = route.request().url()
        
        if (url.includes('/me')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, user })
          })
        } else if (url.includes('/logout')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          })
        } else {
          await route.continue()
        }
      })
      
      return user
    }
    
    await use(loginAs)
  },

  // Mock unauthenticated state
  unauthenticatedUser: async ({ page }, use) => {
    const logout = async (testPage: Page) => {
      await testPage.addInitScript(() => {
        localStorage.removeItem('auth')
        localStorage.removeItem('userPreferences')
      })
      
      await testPage.route('/api/auth/**', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: false, 
            error: 'UNAUTHORIZED',
            message: 'Authentication required' 
          })
        })
      })
    }
    
    await use(logout)
  },

  // Mock auth errors
  authError: async ({ page }, use) => {
    const simulateAuthError = async (testPage: Page, errorType: 'expired' | 'invalid' | 'network' = 'expired') => {
      let status = 401
      let message = 'Token expired'
      
      switch (errorType) {
        case 'invalid':
          status = 401
          message = 'Invalid token'
          break
        case 'network':
          status = 500
          message = 'Authentication service unavailable'
          break
      }
      
      await testPage.route('/api/auth/**', async (route) => {
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: false, 
            error: 'AUTH_ERROR',
            message 
          })
        })
      })
    }
    
    await use(simulateAuthError)
  },

  // Mock user preferences
  userPreferences: async ({ page }, use) => {
    const setPreferences = async (testPage: Page, preferences: TestUser['preferences']) => {
      await testPage.addInitScript((prefs) => {
        localStorage.setItem('userPreferences', JSON.stringify(prefs))
      }, preferences)
      
      await testPage.route('/api/user/preferences', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, preferences })
          })
        } else if (route.request().method() === 'PUT') {
          const body = route.request().postDataJSON()
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              success: true, 
              preferences: { ...preferences, ...body } 
            })
          })
        }
      })
    }
    
    await use(setPreferences)
  },

  // Mock rate limiting based on auth
  authRateLimit: async ({ page }, use) => {
    const simulateRateLimit = async (testPage: Page, userType: 'anonymous' | 'authenticated' = 'anonymous') => {
      const limits = {
        anonymous: { requests: 10, window: 3600 },
        authenticated: { requests: 100, window: 3600 }
      }
      
      const limit = limits[userType]
      
      await testPage.route('/api/**', async (route) => {
        if (route.request().url().includes('/analyze')) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            headers: {
              'X-RateLimit-Limit': limit.requests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': (Date.now() + limit.window * 1000).toString(),
              'Retry-After': limit.window.toString()
            },
            body: JSON.stringify({
              success: false,
              error: 'RATE_LIMIT_EXCEEDED',
              message: `Rate limit exceeded. ${userType === 'anonymous' ? 'Consider signing up for higher limits.' : 'Please try again later.'}`
            })
          })
        } else {
          await route.continue()
        }
      })
    }
    
    await use(simulateRateLimit)
  }
})

// Helper functions for auth testing
export const authHelpers = {
  // Get test user by type
  getTestUser: (userType: keyof typeof testUsers): TestUser => {
    return testUsers[userType]
  },

  // Create custom test user
  createTestUser: (overrides: Partial<TestUser>): TestUser => ({
    id: 'custom-user',
    name: 'Custom User',
    email: 'custom@example.com',
    preferences: {
      view: 'simple',
      notifications: true
    },
    ...overrides
  }),

  // Mock JWT token for testing
  createMockJWT: (userId: string, expiresIn: number = 3600): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresIn
    }))
    const signature = 'mock-signature'
    
    return `${header}.${payload}.${signature}`
  },

  // Check if user is authenticated in tests
  isAuthenticated: async (page: Page): Promise<boolean> => {
    const authData = await page.evaluate(() => {
      const auth = localStorage.getItem('auth')
      return auth ? JSON.parse(auth) : null
    })
    
    return authData && authData.token && authData.expiresAt > Date.now()
  },

  // Get current user from page context
  getCurrentUser: async (page: Page): Promise<TestUser | null> => {
    const authData = await page.evaluate(() => {
      const auth = localStorage.getItem('auth')
      return auth ? JSON.parse(auth) : null
    })
    
    return authData?.user || null
  }
}

export type AuthFixture = typeof authFixture