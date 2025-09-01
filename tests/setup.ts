import '@testing-library/jest-dom'
import React from 'react'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    beforePopState: jest.fn(),
    prefetch: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock Next.js Link component to prevent intersection observer issues
jest.mock('next/link', () => {
  const MockedLink = ({ children, ...props }: any) => {
    return React.createElement('a', props, children)
  }
  MockedLink.displayName = 'Link'
  return MockedLink
})

// Mock environment variables
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test' })
Object.defineProperty(process.env, 'NEXT_PUBLIC_APP_URL', { value: 'http://localhost:3000' })

// Global test utilities
import fetchMock from 'jest-fetch-mock'
global.fetch = fetchMock as unknown as typeof fetch

// Set test environment flag to help logger avoid thread-stream
process.env.JEST_TEST_ENVIRONMENT = 'jsdom'

// Polyfill for Node.js APIs in JSDOM environment
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = setTimeout as unknown as typeof setImmediate
}

if (typeof global.clearImmediate === 'undefined') {
  global.clearImmediate = clearTimeout as unknown as typeof clearImmediate
}

// Suppress console errors during tests unless explicitly needed
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})