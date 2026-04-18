export async function openAndPrintPdfBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  if (!win) return

  const cleanup = () => {
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const handler = () => {
    try {
      win.focus()
      win.print()
    } finally {
      cleanup()
    }
  }

  win.addEventListener('load', handler, { once: true })
  setTimeout(handler, 1500)
}

