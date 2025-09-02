import { test as base, Page } from '@playwright/test'
import { TestDevice } from '../types/test-types'

/**
 * Viewport fixture for testing across different screen sizes and devices
 * Provides utilities for responsive design testing
 */

// Device configurations based on common real-world devices
const deviceConfigs: Record<string, TestDevice> = {
  // Desktop configurations
  desktop: {
    name: 'Desktop 1920x1080',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  },
  
  desktopSmall: {
    name: 'Desktop 1366x768',
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  },

  // Tablet configurations
  ipadPro: {
    name: 'iPad Pro',
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  },
  
  ipad: {
    name: 'iPad',
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  },

  // Mobile configurations
  iphone12: {
    name: 'iPhone 12',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  },
  
  iphone12Mini: {
    name: 'iPhone 12 Mini',
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  },
  
  pixel5: {
    name: 'Google Pixel 5',
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36'
  },
  
  galaxyS21: {
    name: 'Samsung Galaxy S21',
    viewport: { width: 384, height: 854 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36'
  },

  // Edge cases for testing
  smallMobile: {
    name: 'Small Mobile 320px',
    viewport: { width: 320, height: 568 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/604.1'
  },
  
  ultraWide: {
    name: 'Ultra Wide 2560x1080',
    viewport: { width: 2560, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  }
}

// Viewport fixture implementation
export const viewportFixture = base.extend({
  // Set viewport to specific device
  setViewport: async ({ page }, use) => {
    const setDevice = async (testPage: Page, deviceName: keyof typeof deviceConfigs) => {
      const device = deviceConfigs[deviceName]
      if (!device) {
        throw new Error(`Unknown device: ${deviceName}`)
      }

      await testPage.setViewportSize(device.viewport)
      
      if (device.userAgent) {
        await testPage.setExtraHTTPHeaders({
          'User-Agent': device.userAgent
        })
      }

      // Simulate touch device if applicable
      if (device.hasTouch) {
        await testPage.addInitScript(() => {
          Object.defineProperty(navigator, 'maxTouchPoints', { value: 5 })
          Object.defineProperty(navigator, 'msMaxTouchPoints', { value: 5 })
        })
      }

      return device
    }
    
    await use(setDevice)
  },

  // Test responsive breakpoints
  testResponsive: async ({ page }, use) => {
    const testBreakpoints = async (testPage: Page, callback: (device: TestDevice) => Promise<void>) => {
      const testDevices = ['desktop', 'ipad', 'iphone12'] as const
      
      for (const deviceName of testDevices) {
        const device = deviceConfigs[deviceName]
        await testPage.setViewportSize(device.viewport)
        
        if (device.userAgent) {
          await testPage.setExtraHTTPHeaders({
            'User-Agent': device.userAgent
          })
        }

        await callback(device)
      }
    }
    
    await use(testBreakpoints)
  },

  // Simulate touch interactions
  simulateTouch: async ({ page }, use) => {
    const enableTouch = async (testPage: Page) => {
      await testPage.addInitScript(() => {
        // Add touch event support
        Object.defineProperty(navigator, 'maxTouchPoints', { value: 5 })
        Object.defineProperty(navigator, 'msMaxTouchPoints', { value: 5 })
        
        // Mock touch events
        window.TouchEvent = window.TouchEvent || class TouchEvent extends UIEvent {
          constructor(type: string, eventInit: TouchEventInit = {}) {
            super(type, eventInit)
          }
        }
      })
    }
    
    await use(enableTouch)
  },

  // Test orientation changes (portrait/landscape)
  testOrientation: async ({ page }, use) => {
    const testOrientations = async (testPage: Page, callback: (orientation: 'portrait' | 'landscape', size: { width: number, height: number }) => Promise<void>) => {
      const baseDevice = deviceConfigs.iphone12
      
      // Portrait
      await testPage.setViewportSize(baseDevice.viewport)
      await callback('portrait', baseDevice.viewport)
      
      // Landscape
      const landscapeViewport = { 
        width: baseDevice.viewport.height, 
        height: baseDevice.viewport.width 
      }
      await testPage.setViewportSize(landscapeViewport)
      await callback('landscape', landscapeViewport)
    }
    
    await use(testOrientations)
  },

  // Emulate reduced motion preference
  reduceMotion: async ({ page }, use) => {
    const setReducedMotion = async (testPage: Page, reduce: boolean = true) => {
      await testPage.emulateMedia({ 
        reducedMotion: reduce ? 'reduce' : 'no-preference' 
      })
    }
    
    await use(setReducedMotion)
  },

  // Test high contrast mode
  highContrast: async ({ page }, use) => {
    const setHighContrast = async (testPage: Page, enable: boolean = true) => {
      if (enable) {
        await testPage.addStyleTag({
          content: `
            * {
              filter: contrast(150%) !important;
            }
            @media (prefers-contrast: high) {
              * { filter: contrast(200%) !important; }
            }
          `
        })
      }
    }
    
    await use(setHighContrast)
  },

  // Zoom testing
  testZoom: async ({ page }, use) => {
    const testZoomLevels = async (testPage: Page, callback: (zoomLevel: number) => Promise<void>) => {
      const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
      
      for (const zoom of zoomLevels) {
        await testPage.setViewportSize({
          width: Math.floor(1920 / zoom),
          height: Math.floor(1080 / zoom)
        })
        
        await testPage.addInitScript((zoomLevel) => {
          document.body.style.zoom = zoomLevel.toString()
        }, zoom)
        
        await callback(zoom)
      }
    }
    
    await use(testZoomLevels)
  }
})

// Helper functions
export const viewportHelpers = {
  // Get device configuration by name
  getDevice: (name: keyof typeof deviceConfigs): TestDevice => {
    const device = deviceConfigs[name]
    if (!device) {
      throw new Error(`Unknown device: ${name}`)
    }
    return device
  },

  // Get all available devices
  getAllDevices: (): TestDevice[] => {
    return Object.values(deviceConfigs)
  },

  // Get devices by category
  getMobileDevices: (): TestDevice[] => {
    return Object.values(deviceConfigs).filter(device => device.isMobile)
  },

  getTabletDevices: (): TestDevice[] => {
    return Object.values(deviceConfigs).filter(device => !device.isMobile && device.hasTouch)
  },

  getDesktopDevices: (): TestDevice[] => {
    return Object.values(deviceConfigs).filter(device => !device.isMobile && !device.hasTouch)
  },

  // Check if viewport is mobile-sized
  isMobileViewport: (width: number): boolean => {
    return width < 768
  },

  // Check if viewport is tablet-sized
  isTabletViewport: (width: number): boolean => {
    return width >= 768 && width < 1024
  },

  // Check if viewport is desktop-sized
  isDesktopViewport: (width: number): boolean => {
    return width >= 1024
  },

  // Common breakpoints for Tailwind CSS
  tailwindBreakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  }
}

export type ViewportFixture = typeof viewportFixture