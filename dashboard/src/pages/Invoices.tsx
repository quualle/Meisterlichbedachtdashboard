import { useEffect, useState } from 'react'
import { Plus, Search, Eye, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Invoice, Customer } from '../types/database'

type InvoiceWithCustomer = Invoice & { customers: Customer | null }

export function Invoices() {
  const [invoices, setInvoices] = useState<InvoiceWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadInvoices()
  }, [])

  async function loadInvoices() {
    const { data } = await supabase
      .from('invoices')
      .select('*, customers(*)')
      .order('created_at', { ascending: false })

    setInvoices((data as InvoiceWithCustomer[]) || [])
    setLoading(false)
  }

  const filteredInvoices = invoices.filter(inv => {
    const search = searchTerm.toLowerCase()
    return (
      inv.invoice_number.toLowerCase().includes(search) ||
      inv.customers?.company_name?.toLowerCase().includes(search) ||
      inv.customers?.last_name?.toLowerCase().includes(search)
    )
  })

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('de-DE')
  }

  function getStatusBadge(status: string) {
    const styles = {
      draft: 'bg-slate-100 text-slate-700',
      sent: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    }
    const labels = {
      draft: 'Entwurf',
      sent: 'Versendet',
      paid: 'Bezahlt',
      cancelled: 'Storniert'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Rechnungen</h2>
          <p className="text-slate-500 mt-1">Verwalte deine Rechnungen</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neue Rechnung
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800">Rechnungserstellung</h3>
            <p className="text-sm text-amber-700 mt-1">
              Die automatisierte Rechnungserstellung wird im naechsten Schritt implementiert.
              Hier werden dann Kunden, Materialien, Dienstleistungen und Arbeitszeiten
              zusammengefuehrt.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechnungen suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Nr.</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Kunde</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Datum</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Status</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">Betrag</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Lade Rechnungen...
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Keine Rechnungen gefunden
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {invoice.customers
                      ? invoice.customers.company_name || `${invoice.customers.first_name} ${invoice.customers.last_name}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {formatDate(invoice.invoice_date)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-800">
                    {invoice.total.toFixed(2)} EUR
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
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
  )
}
