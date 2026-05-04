import { useState, useEffect, useRef } from 'react'

export function useNumberTick(target: number, durationMs: number = 1000) {
  const [value, setValue] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.1 })

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible || target === 0) return

    let startTimestamp: number | null = null
    let animationFrame: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1)
      
      // Fast up to 80%, crawl for the last 20%
      // We can use a custom easing function here, e.g. easeOutExpo or just simple easeOut
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      
      setValue(Math.floor(easeOutQuart * target))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(step)
      } else {
        setValue(target)
      }
    }

    animationFrame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrame)
  }, [isVisible, target, durationMs])

  return { ref, value }
}
