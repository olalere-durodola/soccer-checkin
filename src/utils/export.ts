import type { Checkin } from '../types'

export function buildCsvContent(checkins: Checkin[]): string {
  const header = '#,First Name,Last Name,Time'
  const rows = checkins.map((c, i) => {
    const time = c.timestamp.toLocaleTimeString()
    return `${i + 1},${c.firstName},${c.lastName},${time}`
  })
  return [header, ...rows].join('\n')
}

export function downloadCsv(checkins: Checkin[], eventName: string): void {
  const content = buildCsvContent(checkins)
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${eventName}-checkins.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadPdf(checkins: Checkin[], eventName: string, eventDate: Date): void {
  import('jspdf').then(({ jsPDF }) => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(eventName, 14, 20)
    doc.setFontSize(11)
    doc.text(eventDate.toLocaleDateString(), 14, 28)
    let y = 42
    doc.setFontSize(10)
    doc.text('#', 14, y); doc.text('First Name', 24, y); doc.text('Last Name', 74, y); doc.text('Time', 124, y)
    y += 4
    doc.line(14, y, 196, y)
    y += 6
    checkins.forEach((c, i) => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(String(i + 1), 14, y); doc.text(c.firstName, 24, y); doc.text(c.lastName, 74, y); doc.text(c.timestamp.toLocaleTimeString(), 124, y)
      y += 8
    })
    doc.save(`${eventName}-checkins.pdf`)
  })
}
