import jsPDF from 'jspdf'

interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  customerName: string
  customerAddress: string
  customerId?: string
  deliveryDate: string
  projectDescription: string
  positions: {
    pos_nr: string
    quantity: number
    unit: string
    description: string
    unit_price: number
    total_price: number
  }[]
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  paymentDays: number
}

// Medvejsek Firmenfarben
const COLORS = {
  orange: '#E67E22',
  darkGray: '#2C3E50',
  lightGray: '#7F8C8D',
  black: '#000000'
}

export function generateInvoicePdf(data: InvoiceData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 210
  const pageHeight = 297
  const marginLeft = 20
  const marginRight = 20
  const contentWidth = pageWidth - marginLeft - marginRight - 15 // 15mm for sidebar

  let yPos = 15

  // ===== HEADER =====

  // Logo-Bereich (vereinfacht als Text, da Bilder komplex sind)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.orange)
  doc.text('MEDVEJSEK', pageWidth / 2, yPos, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'italic')
  doc.text('Meisterlich bedacht!', pageWidth / 2, yPos + 6, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.darkGray)
  doc.text('Dachdeckerei · Spenglerei', pageWidth / 2, yPos + 11, { align: 'center' })

  yPos += 18

  // Absenderzeile
  doc.setFontSize(7)
  doc.setTextColor(COLORS.lightGray)
  doc.text('Meisterbetrieb Medvejsek - Oskar-von-Miller-Str. 28 - 83714 Miesbach', marginLeft, yPos)

  yPos += 8

  // Kundenadresse (links)
  doc.setFontSize(11)
  doc.setTextColor(COLORS.black)
  doc.setFont('helvetica', 'normal')

  const addressLines = data.customerName.split('\n').concat(data.customerAddress.split('\n'))
  addressLines.forEach(line => {
    if (line.trim()) {
      doc.text(line.trim(), marginLeft, yPos)
      yPos += 5
    }
  })

  // Datum und Rechnungsnummer (rechts)
  const rightX = pageWidth - marginRight - 15
  let rightY = yPos - 20

  doc.setFontSize(10)
  doc.text(data.invoiceDate, rightX, rightY, { align: 'right' })
  rightY += 6
  doc.text(`Rechnungs-Nr: ${data.invoiceNumber}`, rightX, rightY, { align: 'right' })
  rightY += 5
  if (data.customerId) {
    doc.text(`Knd.-Nr: ${data.customerId}`, rightX, rightY, { align: 'right' })
  }

  yPos += 10

  // ===== RECHNUNG ÜBERSCHRIFT =====
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Rechnung', marginLeft, yPos)

  yPos += 8

  // Lieferdatum und BV
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Lieferdatum: ${data.deliveryDate}`, marginLeft, yPos)

  yPos += 6
  doc.setFont('helvetica', 'bold')
  doc.text(`BV: ${data.projectDescription}`, marginLeft, yPos, { maxWidth: contentWidth })

  yPos += 10

  // Anrede
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const greeting = data.customerName.includes('Frau') ? 'Sehr geehrte Frau' :
                   data.customerName.includes('Herr') ? 'Sehr geehrter Herr' :
                   'Sehr geehrte Damen und Herren'
  const lastName = data.customerName.split(' ').pop() || ''
  doc.text(`${greeting} ${lastName},`, marginLeft, yPos)

  yPos += 6
  doc.text('für die nachfolgend aufgeführten Leistungen berechnen wir wie folgt:', marginLeft, yPos)

  yPos += 10

  // ===== POSITIONEN TABELLE =====
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)

  // Tabellenkopf
  const colPos = marginLeft
  const colMenge = marginLeft + 12
  const colEinheit = marginLeft + 28
  const colBeschreibung = marginLeft + 42
  const colEinzelpreis = pageWidth - marginRight - 45
  const colGesamt = pageWidth - marginRight - 15

  // Positionen
  doc.setFont('helvetica', 'normal')
  let subtotalOnPage = 0

  data.positions.forEach((pos) => {
    // Prüfen ob neue Seite nötig
    if (yPos > pageHeight - 60) {
      // Übertrag
      doc.setFont('helvetica', 'bold')
      doc.text(`Übertrag: ${subtotalOnPage.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`, colGesamt, pageHeight - 30, { align: 'right' })

      // Neue Seite
      doc.addPage()
      yPos = 25

      // Header auf neuer Seite (vereinfacht)
      doc.setFontSize(8)
      doc.setTextColor(COLORS.lightGray)
      doc.text(data.projectDescription, marginLeft, 15, { maxWidth: contentWidth })
      doc.setTextColor(COLORS.black)
    }

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    // Position
    doc.text(pos.pos_nr + ')', colPos, yPos)
    doc.text(pos.quantity.toLocaleString('de-DE', { minimumFractionDigits: 2 }), colMenge, yPos)
    doc.text(pos.unit, colEinheit, yPos)

    // Beschreibung (kann mehrzeilig sein)
    const descLines = doc.splitTextToSize(pos.description, 70)
    doc.text(descLines[0], colBeschreibung, yPos)

    // Preise (rechtsbündig)
    doc.text(pos.unit_price.toLocaleString('de-DE', { minimumFractionDigits: 2 }), colEinzelpreis, yPos, { align: 'right' })
    doc.text(pos.total_price.toLocaleString('de-DE', { minimumFractionDigits: 2 }), colGesamt, yPos, { align: 'right' })

    subtotalOnPage += pos.total_price

    // Weitere Beschreibungszeilen
    if (descLines.length > 1) {
      for (let i = 1; i < descLines.length; i++) {
        yPos += 4
        doc.text(descLines[i], colBeschreibung, yPos)
      }
    }

    yPos += 8
  })

  yPos += 5

  // ===== SUMMEN =====
  // Linie
  doc.setDrawColor(COLORS.lightGray)
  doc.line(colEinzelpreis - 20, yPos, colGesamt + 5, yPos)

  yPos += 8

  // Zwischensumme
  doc.setFont('helvetica', 'normal')
  doc.text('Zwischensumme €', colEinzelpreis - 5, yPos, { align: 'right' })
  doc.text(data.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 }), colGesamt, yPos, { align: 'right' })

  yPos += 6

  // Summe
  doc.text('Summe €', colEinzelpreis - 5, yPos, { align: 'right' })
  doc.text(data.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 }), colGesamt, yPos, { align: 'right' })

  yPos += 6

  // MwSt
  doc.text(`${data.taxRate} % Mehrwertsteuer €`, colEinzelpreis - 5, yPos, { align: 'right' })
  doc.text(data.taxAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 }), colGesamt, yPos, { align: 'right' })

  yPos += 2
  doc.line(colEinzelpreis - 20, yPos, colGesamt + 5, yPos)
  yPos += 6

  // Gesamtsumme
  doc.setFont('helvetica', 'bold')
  doc.text('Gesamtsumme €', colEinzelpreis - 5, yPos, { align: 'right' })
  doc.setTextColor(COLORS.orange)
  doc.text(data.total.toLocaleString('de-DE', { minimumFractionDigits: 2 }), colGesamt, yPos, { align: 'right' })
  doc.setTextColor(COLORS.black)

  // Doppelte Unterstreichung
  doc.line(colGesamt - 25, yPos + 1, colGesamt + 5, yPos + 1)
  doc.line(colGesamt - 25, yPos + 2, colGesamt + 5, yPos + 2)

  yPos += 15

  // ===== ZAHLUNGSBEDINGUNGEN =====
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  // Fälligkeitsdatum berechnen
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + data.paymentDays)
  const dueDateStr = dueDate.toLocaleDateString('de-DE')

  doc.text(`Zahlbar innerhalb ${data.paymentDays} Tage (${dueDateStr}) ohne Abzug = ${data.total.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € auf das unten aufgeführte Konto.`, marginLeft, yPos, { maxWidth: contentWidth })

  yPos += 8
  doc.setFontSize(8)
  doc.text('Kreissparkasse MB-Teg.: IBAN: DE 88 7115 2570 0000 0227 49 - BIC: BYLADEM 1 MIB', marginLeft, yPos)
  yPos += 4
  doc.text('Raiffeisnbk. im Oberland: IBAN: DE 94 7016 9598 0001 8888 11 - BIC: GENODEF 1 MIB', marginLeft, yPos)

  yPos += 8
  doc.setFontSize(7)
  doc.setTextColor(COLORS.lightGray)
  doc.text('Entsprechend UStG §14b Absatz 1 sind wir verpflichtet Sie darauf hinzuweisen, dass diese Re. mind. 2 Jahre,', marginLeft, yPos)
  yPos += 3
  doc.text('beginnend mit dem folgenden Kalenderjahr, aufbewahrt werden muss.', marginLeft, yPos)

  yPos += 6
  doc.setTextColor(COLORS.black)
  doc.setFontSize(9)
  doc.text('Herzlichen Dank für Ihren geschätzten Auftrag.', marginLeft, yPos)

  // ===== ORANGER SEITENBALKEN (vereinfacht) =====
  const sidebarX = pageWidth - 12
  const sidebarY = 40

  doc.setFillColor(COLORS.orange)
  doc.rect(sidebarX - 2, sidebarY, 14, 180, 'F')

  // Leistungen vertikal
  doc.setTextColor('#FFFFFF')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')

  const services = [
    'Flachdächer',
    'Steildächer',
    'Spenglerei',
    'Wohndachfenster',
    'Dämmungsarbeiten',
    'Äußerer Blitzschutz',
    'Asbestsanierungen',
    'Photovoltaik',
    'Solaranlagen'
  ]

  // Vertikaler Text
  services.forEach((service, index) => {
    doc.text(service, sidebarX + 3, sidebarY + 15 + (index * 18), { angle: 90 })
  })

  // ===== FUßZEILE =====
  const footerY = pageHeight - 25

  // München Skyline (vereinfacht als Linie)
  doc.setDrawColor(COLORS.lightGray)
  doc.setLineWidth(0.5)
  // Vereinfachte Skyline
  doc.line(marginLeft, footerY - 5, pageWidth - marginRight - 15, footerY - 5)

  // Seitenzahl
  doc.setTextColor(COLORS.black)
  doc.setFontSize(8)
  doc.text(`Seite 1 von 1`, pageWidth / 2, footerY, { align: 'center' })

  // Freistellungsbescheid
  doc.setFontSize(6)
  doc.setTextColor(COLORS.lightGray)
  doc.text('Freistellungsbescheid zum Steuerabzug bei Bauleistungen gem. § 48b Abs. 1 Satz 1 des EStG wird auf Wunsch zugestellt', pageWidth / 2, footerY + 4, { align: 'center' })

  // Firmendaten Footer
  doc.setFontSize(7)
  doc.setTextColor(COLORS.black)
  const footerDataY = footerY + 10

  // Spalte 1: Anschrift
  doc.setFont('helvetica', 'bold')
  doc.text('Anschrift', marginLeft, footerDataY)
  doc.setFont('helvetica', 'normal')
  doc.text('Medvejsek GmbH', marginLeft, footerDataY + 3)
  doc.text('Oskar-von-Miller-Straße 28', marginLeft, footerDataY + 6)
  doc.text('83714 Miesbach', marginLeft, footerDataY + 9)

  // Spalte 2: Telefon
  const col2X = marginLeft + 45
  doc.text('Telefon (0 80 25) 74 55', col2X, footerDataY)
  doc.text('Telefax (0 80 25) 69 37', col2X, footerDataY + 3)
  doc.text('info@meisterlichbedacht.de', col2X, footerDataY + 6)
  doc.text('www.meisterlichbedacht.de', col2X, footerDataY + 9)

  // Spalte 3: Bank
  const col3X = marginLeft + 95
  doc.text('Kreissparkasse Miesbach-Tegernsee', col3X, footerDataY)
  doc.text('(BLZ 711 525 70) 22 749', col3X, footerDataY + 3)

  // Spalte 4: Meisterbetrieb
  const col4X = marginLeft + 140
  doc.setFont('helvetica', 'bold')
  doc.text('Meisterbetrieb', col4X, footerDataY)
  doc.setFont('helvetica', 'normal')
  doc.text('Amtsgericht München - HRB 188167', col4X, footerDataY + 3)
  doc.text('Geschäftsführer: Karl Medvejsek', col4X, footerDataY + 6)
  doc.text('USt-IdNr. DE273704137', col4X, footerDataY + 9)

  // PDF speichern
  const filename = `Rechnung_${data.invoiceNumber}_${data.customerName.split(' ')[0]}.pdf`
  doc.save(filename)
}
