import React from 'react'

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="data-table">{children}</table>
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TableRow({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr className={className} onClick={onClick}>
      {children}
    </tr>
  )
}

export function TableCell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={className}>{children}</td>
}
