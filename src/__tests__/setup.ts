import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom does not implement window.matchMedia. Default every query to
// "no match" (i.e. a fine-pointer / desktop device); individual tests
// can override this to simulate other environments.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}
