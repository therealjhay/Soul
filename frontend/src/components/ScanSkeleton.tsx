import React from 'react'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
}

export function ScanSkeleton({ width = '100%', height = 24, className = '' }: SkeletonProps) {
  return (
    <div
      className={`scan-skeleton ${className}`}
      style={{
        width,
        height,
        backgroundColor: 'var(--bg-elevated)',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'var(--radius)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '50%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
          animation: 'scanline 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        }}
      />
    </div>
  )
}

export function ScanSkeletonBlock({ lines = 3, height = 16, gap = 12 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <ScanSkeleton key={i} height={height} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}
