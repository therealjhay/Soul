import { useState, useEffect } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function useGlitchText(targetText: string, trigger: boolean = true) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (!trigger || !targetText) return

    let currentIteration = 0
    // Total cycles = 3, targetText.length * 3 cycles max
    const maxIterations = targetText.length * 3

    const interval = setInterval(() => {
      setText(prev => {
        return targetText.split('').map((char, index) => {
          if (char === ' ') return ' '
          if (index < currentIteration / 3) {
            return targetText[index]
          }
          return CHARS[Math.floor(Math.random() * CHARS.length)]
        }).join('')
      })
      
      currentIteration++
      if (currentIteration >= maxIterations) {
        clearInterval(interval)
        setText(targetText)
      }
    }, 30)

    return () => clearInterval(interval)
  }, [targetText, trigger])

  return text || targetText
}
