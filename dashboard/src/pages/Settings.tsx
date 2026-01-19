import { useEffect, useState } from 'react'
import { Save, Plus, Edit2, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { BillingUnit, ItemCategory } from '../types/database'

export function Settings() {
  const [billingUnits, setBillingUnits] = useState<BillingUnit[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Billing Unit Modal
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState<BillingUnit | null>(null)
  const [unitForm, setUnitForm] = useState({ name: '', abbreviation: '', description: '' })

  // Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [unitsRes, categoriesRes] = await Promise.all([
      supabase.from('billing_units').select('*').order('name'),
      supabase.from('item_categories').select('*').order('name')
    ])

    setBillingUnits(unitsRes.data || [])
    setCategories(categoriesRes.data || [])
    setLoading(false)
  }

  // Billing Units
  function openUnitModal(unit?: BillingUnit) {
    if (unit) {
      setEditingUnit(unit)
      setUnitForm({
        name: unit.name,
        abbreviation: unit.abbreviation,
        description: unit.description || ''
      })
    } else {
      setEditingUnit(null)
      setUnitForm({ name: '', abbreviation: '', description: '' })
    }
    setShowUnitModal(true)
  }

  async function handleUnitSubmit(e: React.FormEvent) {
    e.preventDefault()

    const data = {
      name: unitForm.name,
      abbreviation: unitForm.abbreviation,
      description: unitForm.description || null
    }

    if (editingUnit) {
      await supabase.from('billing_units').update(data).eq('id', editingUnit.id)
    } else {
      await supabase.from('billing_units').insert(data)
    }

    setShowUnitModal(false)
    loadData()
  }

  async function deleteUnit(id: string) {
    if (confirm('Abrechnungseinheit wirklich loeschen?')) {
      await supabase.from('billing_units').delete().eq('id', id)
      loadData()
    }
  }

  // Categories
  function openCategoryModal(category?: ItemCategory) {
    if (category) {
      setEditingCategory(category)
      setCategoryForm({
        name: category.name,
        description: category.description || ''
      })
    } else {
      setEditingCategory(null)
      setCategoryForm({ name: '', description: '' })
    }
    setShowCategoryModal(true)
  }

  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault()

    const data = {
      name: categoryForm.name,
      description: categoryForm.description || null
    }

    if (editingCategory) {
      await supabase.from('item_categories').update(data).eq('id', editingCategory.id)
    } else {
      await supabase.from('item_categories').insert(data)
    }

    setShowCategoryModal(false)
    loadData()
  }

  async function deleteCategory(id: string) {
    if (confirm('Kategorie wirklich loeschen?')) {
      await supabase.from('item_categories').delete().eq('id', id)
      loadData()
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Lade Einstellungen...</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Einstellungen</h2>
        <p className="text-slate-500 mt-1">Verwalte Abrechnungseinheiten und Kategorien</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Billing Units */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">Abrechnungseinheiten</h3>
            <button
              onClick={() => openUnitModal()}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Neu
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {billingUnits.map(unit => (
              <div key={unit.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                <div>
                  <span className="font-medium text-slate-800">{unit.name}</span>
                  <span className="text-slate-400 ml-2">({unit.abbreviation})</span>
                  {unit.description && (
                    <p className="text-sm text-slate-500">{unit.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openUnitModal(unit)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteUnit(unit.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">Kategorien</h3>
            <button
              onClick={() => openCategoryModal()}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Neu
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {categories.map(category => (
              <div key={category.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                <div>
                  <span className="font-medium text-slate-800">{category.name}</span>
                  {category.description && (
                    <p className="text-sm text-slate-500">{category.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openCategoryModal(category)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingUnit ? 'Einheit bearbeiten' : 'Neue Einheit'}
              </h3>
              <button onClick={() => setShowUnitModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleUnitSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Laufender Meter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Abkuerzung *</label>
                <input
                  type="text"
                  required
                  value={unitForm.abbreviation}
                  onChange={(e) => setUnitForm({ ...unitForm, abbreviation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. lfm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beschreibung</label>
                <input
                  type="text"
                  value={unitForm.description}
                  onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Dachziegel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beschreibung</label>
                <input
                  type="text"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
