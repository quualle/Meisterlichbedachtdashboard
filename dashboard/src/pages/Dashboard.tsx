import { useEffect, useState } from 'react'
import { Users, Package, Wrench, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Stats {
  customers: number
  materials: number
  services: number
  invoices: number
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    customers: 0,
    materials: 0,
    services: 0,
    invoices: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const [customersRes, itemsRes, invoicesRes] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('items').select('id, item_type'),
        supabase.from('invoices').select('id', { count: 'exact', head: true })
      ])

      const materials = itemsRes.data?.filter(i => i.item_type === 'material').length || 0
      const services = itemsRes.data?.filter(i => i.item_type === 'service').length || 0

      setStats({
        customers: customersRes.count || 0,
        materials,
        services,
        invoices: invoicesRes.count || 0
      })
      setLoading(false)
    }

    loadStats()
  }, [])

  const cards = [
    { name: 'Kunden', value: stats.customers, icon: Users, color: 'bg-blue-500' },
    { name: 'Materialien', value: stats.materials, icon: Package, color: 'bg-green-500' },
    { name: 'Dienstleistungen', value: stats.services, icon: Wrench, color: 'bg-amber-500' },
    { name: 'Rechnungen', value: stats.invoices, icon: FileText, color: 'bg-purple-500' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-slate-500 mt-1">Willkommen im meisterlichbedacht Dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <div key={card.name} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{card.name}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {loading ? '-' : card.value}
                </p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Schnellaktionen</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/kunden"
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <Users className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-slate-700">Neuer Kunde</span>
          </a>
          <a
            href="/rechnungen"
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-slate-700">Neue Rechnung</span>
          </a>
          <a
            href="/dokumente"
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <Package className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-slate-700">Dokument hochladen</span>
          </a>
        </div>
      </div>
    </div>
  )
}
