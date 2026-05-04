import { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }} // ease-std
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  )
}
