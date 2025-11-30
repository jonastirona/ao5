import { useEffect, useRef } from 'react'

export function useFocusTrap(isOpen: boolean, onClose?: () => void, existingRef?: React.RefObject<HTMLDivElement | null>) {
  const internalRef = useRef<HTMLDivElement>(null)
  const containerRef = existingRef || internalRef

  useEffect(() => {
    if (!isOpen) return

    const element = containerRef.current
    if (!element) return

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    // Focus the first element when opened
    if (firstElement) {
      firstElement.focus()
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
      handleTab(e)
    }

    element.addEventListener('keydown', handleKeyDown)
    return () => {
      element.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, containerRef])

  return containerRef
}
