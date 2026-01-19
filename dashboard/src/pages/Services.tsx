import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { ItemWithRelations, ItemCategory, BillingUnit } from '../types/database'

export function Services() {
  const [items, setItems] = useState<ItemWithRelations[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [billingUnits, setBillingUnits] = useState<BillingUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemWithRelations | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    billing_unit_id: '',
    default_price: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [itemsRes, categoriesRes, unitsRes] = await Promise.all([
      supabase
        .from('items')
        .select('*, item_categories(*), billing_units(*)')
        .eq('item_type', 'service')
        .eq('is_active', true)
        .order('name'),
      supabase.from('item_categories').select('*').order('name'),
      supabase.from('billing_units').select('*').order('name')
    ])

    setItems((itemsRes.data as ItemWithRelations[]) || [])
    setCategories(categoriesRes.data || [])
    setBillingUnits(unitsRes.data || [])
    setLoading(false)
  }

  const filteredItems = items.filter(i => {
    const search = searchTerm.toLowerCase()
    return (
      i.name.toLowerCase().includes(search) ||
      i.description?.toLowerCase().includes(search) ||
      i.item_categories?.name.toLowerCase().includes(search)
    )
  })

  function openModal(item?: ItemWithRelations) {
    if (item) {
      setEditingItem(item)
      setFormData({
        name: item.name,
        description: item.description || '',
        category_id: item.category_id || '',
        billing_unit_id: item.billing_unit_id || '',
        default_price: item.default_price?.toString() || ''
      })
    } else {
      setEditingItem(null)
      setFormData({
        name: '',
        description: '',
        category_id: '',
        billing_unit_id: '',
        default_price: ''
      })
    }
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const data = {
      name: formData.name,
      description: formData.description || null,
      item_type: 'service' as const,
      category_id: formData.category_id || null,
      billing_unit_id: formData.billing_unit_id || null,
      default_price: formData.default_price ? parseFloat(formData.default_price) : null
    }

    if (editingItem) {
      await supabase
        .from('items')
        .update(data)
        .eq('id', editingItem.id)
    } else {
      await supabase
        .from('items')
        .insert(data)
    }

    setShowModal(false)
    loadData()
  }

  async function handleDelete(id: string) {
    if (confirm('Dienstleistung wirklich loeschen?')) {
      await supabase
        .from('items')
        .update({ is_active: false })
        .eq('id', id)
      loadData()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dienstleistungen</h2>
          <p className="text-slate-500 mt-1">Verwalte deine Dienstleistungen</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neue Dienstleistung
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Dienstleistungen suchen..."
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
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Name</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Kategorie</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Einheit</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">Preis</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Lade Dienstleistungen...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Keine Dienstleistungen gefunden
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{item.name}</div>
                    {item.description && (
                      <div className="text-sm text-slate-500">{item.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {item.item_categories?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {item.billing_units?.abbreviation || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {item.default_price ? `${item.default_price.toFixed(2)} EUR` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openModal(item)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingItem ? 'Dienstleistung bearbeiten' : 'Neue Dienstleistung'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beschreibung</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategorie</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Keine --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Abrechnungseinheit</label>
                  <select
                    value={formData.billing_unit_id}
                    onChange={(e) => setFormData({ ...formData, billing_unit_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Keine --</option>
                    {billingUnits.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name} ({unit.abbreviation})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Standardpreis (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.default_price}
                    onChange={(e) => setFormData({ ...formData, default_price: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingItem ? 'Speichern' : 'Anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
