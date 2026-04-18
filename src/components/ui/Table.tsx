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

export function TableRow({ children, className = '', style, onClick }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <tr className={className} style={style} onClick={onClick}>
      {children}
    </tr>
  )
}

export function TableCell({
  children,
  className = '',
  style,
  onClick
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: (e: React.MouseEvent<HTMLTableCellElement>) => void
}) {
  return <td className={className} style={style} onClick={onClick}>{children}</td>
}
