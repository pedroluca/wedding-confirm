import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Seção que aparece com fade-up ao entrar na tela (só com motion-safe). */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      className={`${visible ? 'motion-safe:animate-fade-up' : 'motion-safe:opacity-0'} ${className}`}
    >
      {children}
    </section>
  )
}
