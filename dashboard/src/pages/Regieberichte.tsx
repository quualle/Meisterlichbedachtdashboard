import { useEffect, useState, useRef } from 'react'
import { FileText, Eye, Plus, CheckCircle, Clock, AlertCircle, RefreshCw, FileCheck, Download, ChevronDown, Search, Loader2, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { generateInvoicePdf } from '../components/InvoicePdfGenerator'

// Types for position mapping
interface CatalogPosition {
  id: string
  name: string
  category: string
  subcategory: string
  unit: string
  price_net: number
}

interface MappedPosition {
  catalog_id: string | null
  catalog_name: string | null
  original_text: string
  suggested_quantity: number
  suggested_unit: string
  confidence: 'high' | 'medium' | 'low' | 'manual'
  price_net: number | null
}

// Edge Function URLs
const MAPPING_URL = 'https://jprzdmmvyxqejifazkbo.supabase.co/functions/v1/map-rapport-positions'

interface Rapport {
  id: string
  rapport_id: string
  construction_id: string
  construction_name: string
  customer_name: string
  created_date: string
  status: 'neu' | 'in_bearbeitung' | 'rechnung_erstellt'
  total_hours: number | null
  time_entries: any[]
  material_entries: any[]
  leistungsbeschreibung: string | null
  project_address: string | null
}

interface ApiRapport {
  rapport_id: string
  created_date: string
  construction_id: string
  construction_name: string
  customer_name: string
}

// Supabase Edge Function Proxy (umgeht CORS)
const PROXY_URL = 'https://jprzdmmvyxqejifazkbo.supabase.co/functions/v1/mh-api-proxy'

export function Regieberichte() {
  const [rapports, setRapports] = useState<Rapport[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedRapports, setSelectedRapports] = useState<Set<string>>(new Set())
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null)
  const [showInvoiceEditor, setShowInvoiceEditor] = useState(false)

  useEffect(() => {
    loadRapports()
  }, [])

  async function loadRapports() {
    setLoading(true)
    const { data } = await supabase
      .from('rapports')
      .select('*')
      .order('created_date', { ascending: false })

    if (data) {
      setRapports(data)
    }
    setLoading(false)
  }

  async function syncFromApi() {
    setSyncing(true)
    try {
      // Fetch via Supabase Edge Function Proxy (umgeht CORS)
      const response = await fetch(
        `${PROXY_URL}?endpoint=trigger_rapport_created`
      )
      const result = await response.json()

      if (result.data) {
        // Upsert each rapport
        for (const apiRapport of result.data as ApiRapport[]) {
          await supabase.from('rapports').upsert({
            rapport_id: apiRapport.rapport_id,
            construction_id: apiRapport.construction_id,
            construction_name: apiRapport.construction_name,
            customer_name: apiRapport.customer_name,
            created_date: apiRapport.created_date,
            fetched_at: new Date().toISOString()
          }, {
            onConflict: 'rapport_id'
          })
        }
        await loadRapports()
      }
    } catch (error) {
      console.error('Sync error:', error)
    }
    setSyncing(false)
  }

  async function loadPdf(rapportId: string) {
    try {
      const response = await fetch(
        `${PROXY_URL}?endpoint=get_rapport_pdf`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rapport_id: parseInt(rapportId) })
        }
      )
      const result = await response.json()

      if (result.pdf_base64) {
        // Convert base64 to blob URL
        const binary = atob(result.pdf_base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setSelectedPdfUrl(url)
      }
    } catch (error) {
      console.error('PDF load error:', error)
    }
  }

  function toggleSelection(id: string) {
    const newSelection = new Set(selectedRapports)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedRapports(newSelection)
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'neu':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <AlertCircle className="w-3 h-3" /> Neu
          </span>
        )
      case 'in_bearbeitung':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" /> In Bearbeitung
          </span>
        )
      case 'rechnung_erstellt':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" /> Rechnung erstellt
          </span>
        )
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const selectedRapportsList = rapports.filter(r => selectedRapports.has(r.id))

  if (showInvoiceEditor && selectedRapportsList.length > 0) {
    return (
      <InvoiceEditor
        rapports={selectedRapportsList}
        onBack={() => {
          setShowInvoiceEditor(false)
          setSelectedRapports(new Set())
        }}
        onComplete={() => {
          setShowInvoiceEditor(false)
          setSelectedRapports(new Set())
          loadRapports()
        }}
      />
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Regieberichte</h2>
          <p className="text-slate-500 mt-1">
            {rapports.length} Berichte geladen
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={syncFromApi}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronisiere...' : 'Von API laden'}
          </button>
          {selectedRapports.size > 0 && (
            <button
              onClick={() => setShowInvoiceEditor(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Rechnung erstellen ({selectedRapports.size})
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Rapport List */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="max-h-[700px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={selectedRapports.size === rapports.filter(r => r.status !== 'rechnung_erstellt').length && rapports.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRapports(new Set(rapports.filter(r => r.status !== 'rechnung_erstellt').map(r => r.id)))
                        } else {
                          setSelectedRapports(new Set())
                        }
                      }}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Datum</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Projekt</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Kunde</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-500">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Lade Regieberichte...
                    </td>
                  </tr>
                ) : rapports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-12 h-12 text-slate-300" />
                        <p>Keine Regieberichte vorhanden</p>
                        <button
                          onClick={syncFromApi}
                          className="text-blue-600 hover:underline"
                        >
                          Jetzt von API laden
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rapports.map((rapport) => (
                    <tr
                      key={rapport.id}
                      className={`hover:bg-slate-50 ${selectedRapports.has(rapport.id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={selectedRapports.has(rapport.id)}
                          disabled={rapport.status === 'rechnung_erstellt'}
                          onChange={() => toggleSelection(rapport.id)}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(rapport.created_date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-800 max-w-xs truncate">
                          {rapport.construction_name}
                        </div>
                        <div className="text-xs text-slate-400">
                          #{rapport.rapport_id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {rapport.customer_name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(rapport.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => loadPdf(rapport.rapport_id)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                          title="PDF anzeigen"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PDF Preview */}
        <div className="w-[500px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-medium text-slate-700">PDF Vorschau</h3>
          </div>
          <div className="h-[650px]">
            {selectedPdfUrl ? (
              <iframe
                src={selectedPdfUrl}
                className="w-full h-full"
                title="Rapport PDF"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p>Klicken Sie auf das Auge-Symbol,</p>
                  <p>um eine PDF-Vorschau zu laden</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Searchable Dropdown Component for Position Selection
interface SearchableDropdownProps {
  catalog: CatalogPosition[]
  selectedId: string | null
  onSelect: (position: CatalogPosition | null) => void
  originalText: string
}

function SearchableDropdown({ catalog, selectedId, onSelect, originalText }: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter catalog based on search term
  const filteredCatalog = catalog.filter(item => {
    const term = searchTerm.toLowerCase()
    return (
      item.name.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term) ||
      item.subcategory.toLowerCase().includes(term)
    )
  })

  // Group by category
  const groupedCatalog = filteredCatalog.reduce((acc, item) => {
    const key = item.category
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, CatalogPosition[]>)

  const selectedItem = catalog.find(c => c.id === selectedId)

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setTimeout(() => inputRef.current?.focus(), 100)
        }}
        className={`w-full px-2 py-1 border rounded text-sm text-left flex items-center justify-between gap-1 ${
          selectedId ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'
        }`}
      >
        <span className="truncate flex-1">
          {selectedItem ? selectedItem.name : originalText}
        </span>
        <ChevronDown className="w-3 h-3 flex-shrink-0 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-96 bg-white border border-slate-200 rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Suchen im Katalog..."
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto">
            {/* Manual Entry Option */}
            <button
              onClick={() => {
                onSelect(null)
                setIsOpen(false)
                setSearchTerm('')
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
            >
              <span className="text-amber-600 font-medium">✎ Manuell eingeben</span>
              <span className="text-slate-400 text-xs truncate">({originalText})</span>
            </button>

            {/* Grouped Results */}
            {Object.entries(groupedCatalog).map(([category, items]) => (
              <div key={category}>
                <div className="px-3 py-1 bg-slate-50 text-xs font-medium text-slate-500 sticky top-0">
                  {category}
                </div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item)
                      setIsOpen(false)
                      setSearchTerm('')
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between ${
                      item.id === selectedId ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-700 truncate">{item.name}</div>
                      <div className="text-xs text-slate-400">{item.subcategory}</div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="font-medium text-slate-700">{Number(item.price_net).toFixed(2)} €</div>
                      <div className="text-xs text-slate-400">{item.unit}</div>
                    </div>
                  </button>
                ))}
              </div>
            ))}

            {filteredCatalog.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                Keine Treffer für "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Invoice Editor Component
interface InvoiceEditorProps {
  rapports: Rapport[]
  onBack: () => void
  onComplete: () => void
}

interface InvoicePosition {
  id: string
  pos_nr: string
  catalog_id: string | null
  catalog_name: string | null
  original_text: string
  quantity: number
  unit: string
  description: string
  unit_price: number
  total_price: number
  confidence: 'high' | 'medium' | 'low' | 'manual'
  editable: boolean
}

function InvoiceEditor({ rapports, onBack, onComplete }: InvoiceEditorProps) {
  const [positions, setPositions] = useState<InvoicePosition[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [distanceOver35km, setDistanceOver35km] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [priceCatalog, setPriceCatalog] = useState<CatalogPosition[]>([])
  const [isMapping, setIsMapping] = useState(false)
  const [mappingError, setMappingError] = useState<string | null>(null)

  useEffect(() => {
    loadPriceCatalog()
    initializeBasicInfo()
  }, [])

  // Start LLM mapping when catalog is loaded
  useEffect(() => {
    if (priceCatalog.length > 0 && positions.length === 0) {
      performLlmMapping()
    }
  }, [priceCatalog])

  async function loadPriceCatalog() {
    const { data } = await supabase.from('price_catalog').select('id, name, category, subcategory, unit, price_net')
    if (data) setPriceCatalog(data as CatalogPosition[])
  }

  function initializeBasicInfo() {
    setCustomerName(rapports[0]?.customer_name || '')
    setProjectDescription(rapports.map(r => r.construction_name).join(' / '))
  }

  async function performLlmMapping() {
    setIsMapping(true)
    setMappingError(null)

    try {
      // Get rapport IDs for OCR + mapping
      const rapportIds = rapports.map(r => r.rapport_id)

      // Call the mapping edge function with rapport IDs
      // The edge function will: 1) fetch PDFs, 2) OCR with Mistral, 3) map with GPT-5.2
      const response = await fetch(MAPPING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rapport_ids: rapportIds
        })
      })

      const result = await response.json()

      if (result.success && result.mapped_positions) {
        // Convert mapped positions to invoice positions
        const invoicePositions: InvoicePosition[] = result.mapped_positions.map((mp: MappedPosition, idx: number) => ({
          id: `mapped-${idx}`,
          pos_nr: `0${Math.floor(idx / 10) + 1}.${String((idx % 10) + 1).padStart(2, '0')}`,
          catalog_id: mp.catalog_id,
          catalog_name: mp.catalog_name,
          original_text: mp.original_text,
          quantity: mp.suggested_quantity,
          unit: mp.suggested_unit,
          description: mp.catalog_name || mp.original_text,
          unit_price: mp.price_net || 0,
          total_price: (mp.suggested_quantity || 0) * (mp.price_net || 0),
          confidence: mp.confidence,
          editable: true
        }))

        setPositions(invoicePositions)

        // Update catalog if returned
        if (result.catalog) {
          setPriceCatalog(result.catalog)
        }
      } else {
        setMappingError(result.error || 'Mapping fehlgeschlagen')
        // Fallback: simple initialization
        fallbackInitialize()
      }
    } catch (error) {
      console.error('Mapping error:', error)
      setMappingError('Fehler bei der KI-Zuordnung. Manuelle Eingabe möglich.')
      fallbackInitialize()
    }

    setIsMapping(false)
  }

  function fallbackInitialize() {
    // Simple fallback without LLM
    const combined = {
      timeEntries: rapports.flatMap(r => r.time_entries || []),
      materialEntries: rapports.flatMap(r => r.material_entries || [])
    }

    const timePositions: InvoicePosition[] = combined.timeEntries.map((entry: any, idx: number) => ({
      id: `time-${idx}`,
      pos_nr: `01.${String(idx + 1).padStart(2, '0')}`,
      catalog_id: null,
      catalog_name: null,
      original_text: `Arbeitszeit ${entry.employee || 'Mitarbeiter'}`,
      quantity: entry.hours || 0,
      unit: 'Std',
      description: `Arbeitszeit ${entry.employee || 'Mitarbeiter'}`,
      unit_price: 67.00,
      total_price: (entry.hours || 0) * 67.00,
      confidence: 'manual',
      editable: true
    }))

    const materialPositions: InvoicePosition[] = combined.materialEntries.map((entry: any, idx: number) => ({
      id: `mat-${idx}`,
      pos_nr: `02.${String(idx + 1).padStart(2, '0')}`,
      catalog_id: null,
      catalog_name: null,
      original_text: entry.material || 'Material',
      quantity: entry.quantity || 1,
      unit: entry.unit || 'Stk',
      description: entry.material || 'Material',
      unit_price: 0,
      total_price: 0,
      confidence: 'manual',
      editable: true
    }))

    setPositions([...timePositions, ...materialPositions])
  }

  function handleCatalogSelect(positionId: string, catalogItem: CatalogPosition | null) {
    setPositions(prev => prev.map(p => {
      if (p.id === positionId) {
        if (catalogItem) {
          const newPrice = Number(catalogItem.price_net)
          return {
            ...p,
            catalog_id: catalogItem.id,
            catalog_name: catalogItem.name,
            description: catalogItem.name,
            unit: catalogItem.unit,
            unit_price: newPrice,
            total_price: p.quantity * newPrice,
            confidence: 'high' as const
          }
        } else {
          // Manual entry
          return {
            ...p,
            catalog_id: null,
            catalog_name: null,
            description: p.original_text,
            confidence: 'manual' as const
          }
        }
      }
      return p
    }))
  }

  function updatePosition(id: string, field: string, value: any) {
    setPositions(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: value }
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = (updated.quantity || 0) * (updated.unit_price || 0)
        }
        return updated
      }
      return p
    }))
  }

  function addPosition() {
    const newPos: InvoicePosition = {
      id: `new-${Date.now()}`,
      pos_nr: `03.${String(positions.length + 1).padStart(2, '0')}`,
      catalog_id: null,
      catalog_name: null,
      original_text: 'Neue Position',
      quantity: 1,
      unit: 'Stk',
      description: '',
      unit_price: 0,
      total_price: 0,
      confidence: 'manual',
      editable: true
    }
    setPositions([...positions, newPos])
  }

  function removePosition(id: string) {
    setPositions(prev => prev.filter(p => p.id !== id))
  }

  // Update prices when distance is selected
  useEffect(() => {
    if (distanceOver35km !== null) {
      const hourlyRate = distanceOver35km ? 69.50 : 67.00
      setPositions(prev => prev.map(p => {
        if (p.unit === 'Std') {
          return {
            ...p,
            unit_price: hourlyRate,
            total_price: (p.quantity || 0) * hourlyRate
          }
        }
        return p
      }))
    }
  }, [distanceOver35km])

  function getConfidenceBadge(confidence: string) {
    switch (confidence) {
      case 'high':
        return <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">KI ✓</span>
      case 'medium':
        return <span className="px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-700">KI ~</span>
      case 'low':
        return <span className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700">KI ?</span>
      default:
        return <span className="px-1.5 py-0.5 text-xs rounded bg-slate-100 text-slate-600">Manuell</span>
    }
  }

  const subtotal = positions.reduce((sum, p) => sum + (p.total_price || 0), 0)
  const taxAmount = subtotal * 0.19
  const total = subtotal + taxAmount
  const hasMissingPrices = positions.some(p => p.unit_price === 0 && p.confidence !== 'manual')

  async function saveInvoice() {
    setSaving(true)

    // Create invoice
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        customer_id: null, // TODO: Link to customer
        invoice_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        project_description: projectDescription,
        delivery_date: deliveryDate || null,
        positions: positions,
        subtotal: subtotal,
        tax_rate: 19,
        tax_amount: taxAmount,
        total: total,
        notes: customerAddress
      })
      .select()
      .single()

    if (invoice) {
      // Link rapports to invoice
      for (const rapport of rapports) {
        await supabase.from('invoice_rapports').insert({
          invoice_id: invoice.id,
          rapport_id: rapport.id
        })

        // Update rapport status
        await supabase
          .from('rapports')
          .update({ status: 'rechnung_erstellt' })
          .eq('id', rapport.id)
      }
    }

    setSaving(false)
    onComplete()
  }

  function handleGeneratePdf() {
    // Rechnungsnummer generieren (vereinfacht - in Produktion aus DB)
    const invoiceNumber = `26${String(Date.now()).slice(-3)}`

    // Datum formatieren
    const today = new Date()
    const invoiceDate = today.toLocaleDateString('de-DE')
    const deliveryDateFormatted = deliveryDate
      ? new Date(deliveryDate).toLocaleDateString('de-DE')
      : today.toLocaleDateString('de-DE')

    generateInvoicePdf({
      invoiceNumber,
      invoiceDate,
      customerName: customerName,
      customerAddress: customerAddress || '',
      deliveryDate: deliveryDateFormatted,
      projectDescription: projectDescription,
      positions: positions.map(p => ({
        pos_nr: p.pos_nr,
        quantity: p.quantity,
        unit: p.unit,
        description: p.description,
        unit_price: p.unit_price,
        total_price: p.total_price
      })),
      subtotal,
      taxRate: 19,
      taxAmount,
      total,
      paymentDays: 10
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={onBack}
            className="text-slate-500 hover:text-slate-700 mb-2"
          >
            &larr; Zurück zur Übersicht
          </button>
          <h2 className="text-2xl font-bold text-slate-800">Rechnung erstellen</h2>
          <p className="text-slate-500 mt-1">
            Aus {rapports.length} Regiebericht{rapports.length > 1 ? 'en' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
          >
            Abbrechen
          </button>
          <button
            onClick={saveInvoice}
            disabled={saving || distanceOver35km === null || hasMissingPrices}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <FileCheck className="w-4 h-4" />
            {saving ? 'Speichere...' : 'Rechnung speichern'}
          </button>
          <button
            onClick={handleGeneratePdf}
            disabled={distanceOver35km === null || positions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            PDF generieren
          </button>
        </div>
      </div>

      {/* Distance Question */}
      {distanceOver35km === null && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h3 className="font-medium text-amber-800 mb-3">
            Entfernung zur Baustelle
          </h3>
          <p className="text-sm text-amber-700 mb-4">
            Bitte wählen Sie die Entfernung vom Firmensitz (83714 Miesbach) zur Baustelle:
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setDistanceOver35km(false)}
              className="flex-1 p-4 bg-white border-2 border-amber-200 rounded-lg hover:border-amber-400 text-center"
            >
              <div className="text-2xl font-bold text-slate-800">67,00 €</div>
              <div className="text-sm text-slate-500">≤ 35 km Entfernung</div>
            </button>
            <button
              onClick={() => setDistanceOver35km(true)}
              className="flex-1 p-4 bg-white border-2 border-amber-200 rounded-lg hover:border-amber-400 text-center"
            >
              <div className="text-2xl font-bold text-slate-800">69,50 €</div>
              <div className="text-sm text-slate-500">&gt; 35 km Entfernung</div>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Invoice Form */}
        <div className="col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-medium text-slate-800 mb-4">Kundeninformationen</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Kundenname
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Lieferdatum
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Adresse
                </label>
                <textarea
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Projekt / BV
                </label>
                <input
                  type="text"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Positions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-medium text-slate-800">Positionen</h3>
                {isMapping && (
                  <span className="inline-flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <Sparkles className="w-4 h-4" />
                    KI analysiert Regiebericht...
                  </span>
                )}
              </div>
              <button
                onClick={addPosition}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Position hinzufügen
              </button>
            </div>

            {mappingError && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                {mappingError}
              </div>
            )}

            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-500 border-b border-slate-200">
                  <th className="pb-2 w-16">Pos.</th>
                  <th className="pb-2 w-16">Status</th>
                  <th className="pb-2 w-20">Menge</th>
                  <th className="pb-2 w-16">Einheit</th>
                  <th className="pb-2">Katalog-Position</th>
                  <th className="pb-2 w-28 text-right">Einzelpreis</th>
                  <th className="pb-2 w-28 text-right">Gesamt</th>
                  <th className="pb-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isMapping ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p>Analysiere Regiebericht mit GPT-5.2...</p>
                        <p className="text-xs text-slate-400">Positionen werden automatisch zugeordnet</p>
                      </div>
                    </td>
                  </tr>
                ) : positions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Keine Positionen vorhanden. Klicken Sie auf "+ Position hinzufügen"
                    </td>
                  </tr>
                ) : (
                  positions.map((pos) => (
                    <tr key={pos.id} className={pos.unit_price === 0 ? 'bg-amber-50' : ''}>
                      <td className="py-2 text-sm text-slate-600">{pos.pos_nr}</td>
                      <td className="py-2">
                        {getConfidenceBadge(pos.confidence)}
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          value={pos.quantity}
                          onChange={(e) => updatePosition(pos.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 border border-slate-200 rounded text-sm"
                          step="0.5"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="text"
                          value={pos.unit}
                          onChange={(e) => updatePosition(pos.id, 'unit', e.target.value)}
                          className="w-14 px-2 py-1 border border-slate-200 rounded text-sm"
                        />
                      </td>
                      <td className="py-2">
                        <SearchableDropdown
                          catalog={priceCatalog}
                          selectedId={pos.catalog_id}
                          onSelect={(item) => handleCatalogSelect(pos.id, item)}
                          originalText={pos.original_text}
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          value={pos.unit_price}
                          onChange={(e) => updatePosition(pos.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className={`w-24 px-2 py-1 border rounded text-sm text-right ${
                            pos.unit_price === 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                          }`}
                          step="0.01"
                        />
                      </td>
                      <td className="py-2 text-right text-sm font-medium">
                        {pos.total_price.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => removePosition(pos.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {hasMissingPrices && !isMapping && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                Einige Positionen haben keinen Preis. Wählen Sie eine Katalog-Position aus dem Dropdown oder geben Sie den Preis manuell ein.
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary */}
        <div className="space-y-6">
          {/* Invoice Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-medium text-slate-800 mb-4">Zusammenfassung</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Zwischensumme</span>
                <span className="font-medium">{subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">MwSt. 19%</span>
                <span className="font-medium">{taxAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between">
                <span className="font-medium text-slate-800">Gesamtsumme</span>
                <span className="font-bold text-lg">{total.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
              </div>
            </div>
          </div>

          {/* Selected Rapports */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-medium text-slate-800 mb-4">Verknüpfte Regieberichte</h3>
            <div className="space-y-2">
              {rapports.map(r => (
                <div key={r.id} className="p-2 bg-slate-50 rounded text-sm">
                  <div className="font-medium text-slate-700">#{r.rapport_id}</div>
                  <div className="text-slate-500 text-xs truncate">{r.construction_name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stundensatz Info */}
          {distanceOver35km !== null && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <div className="text-sm text-blue-700">
                <strong>Stundensatz:</strong> {distanceOver35km ? '69,50 €' : '67,00 €'}
                <br />
                <span className="text-xs">({distanceOver35km ? '> 35 km' : '≤ 35 km'} Entfernung)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
