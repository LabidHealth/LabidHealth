import React from 'react'

interface AvatarProps {
  name: string
  src?: string | null
}

const colorMap = ['avatar--a', 'avatar--b', 'avatar--c', 'avatar--d', 'avatar--e']

export function Avatar({ name, src }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const bucket = name.charCodeAt(0) % colorMap.length

  return src ? (
    <img className="avatar avatar--photo" src={src} alt={name} />
  ) : (
    <span className={`avatar ${colorMap[bucket]}`}>{initials}</span>
  )
}
