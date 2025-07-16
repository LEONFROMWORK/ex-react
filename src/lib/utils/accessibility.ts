// Accessibility utilities

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Generate unique ID for form elements
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Focus trap utility for modals/dialogs
 */
export class FocusTrap {
  private element: HTMLElement
  private firstFocusable: HTMLElement | null = null
  private lastFocusable: HTMLElement | null = null
  
  constructor(element: HTMLElement) {
    this.element = element
    this.init()
  }
  
  private init() {
    const focusableElements = this.element.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements.length > 0) {
      this.firstFocusable = focusableElements[0] as HTMLElement
      this.lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement
    }
  }
  
  trap() {
    if (!this.firstFocusable || !this.lastFocusable) return
    
    this.element.addEventListener('keydown', this.handleKeyDown)
    this.firstFocusable.focus()
  }
  
  release() {
    this.element.removeEventListener('keydown', this.handleKeyDown)
  }
  
  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    
    if (e.shiftKey) {
      if (document.activeElement === this.firstFocusable) {
        e.preventDefault()
        this.lastFocusable?.focus()
      }
    } else {
      if (document.activeElement === this.lastFocusable) {
        e.preventDefault()
        this.firstFocusable?.focus()
      }
    }
  }
}

/**
 * Skip to main content link
 */
export function createSkipLink(): HTMLAnchorElement {
  const link = document.createElement('a')
  link.href = '#main-content'
  link.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded'
  link.textContent = 'Skip to main content'
  
  link.addEventListener('click', (e) => {
    e.preventDefault()
    const main = document.getElementById('main-content')
    if (main) {
      main.tabIndex = -1
      main.focus()
    }
  })
  
  return link
}