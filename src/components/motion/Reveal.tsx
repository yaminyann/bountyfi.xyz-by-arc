import { createElement, useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** True once the element has entered the viewport. It never goes back to false, so scenes play once and then rest. */
export function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null)
  // Without IntersectionObserver there is nothing to wait for, so content is shown at once.
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const node = ref.current
    if (!node || seen) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [seen, threshold])

  return [ref, seen] as const
}

interface RevealProps {
  children: ReactNode
  as?: ElementType
  className?: string
  /** Delay in milliseconds, so siblings arrive one after another. */
  delay?: number
}

/** Content rises into place the first time it scrolls into view. */
export function Reveal({ children, as = 'div', className, delay = 0 }: RevealProps) {
  const [ref, seen] = useInView<HTMLElement>(0.12)
  return createElement(
    as,
    { ref, className: cn('reveal', className), 'data-in': seen ? 'true' : 'false', style: { '--d': `${delay}ms` } as CSSProperties },
    children,
  )
}

/** Wraps an SVG scene: its pieces carry a-grow-y, a-drop and similar classes and play when this wrapper is seen. */
export function Scene({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.3)
  return (
    <div ref={ref} data-in={seen ? 'true' : 'false'} className={className} role="img" aria-label={label}>
      {children}
    </div>
  )
}
