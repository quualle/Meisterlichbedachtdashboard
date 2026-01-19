import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Trash2, X, Euro } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { EmployeeWithRole, EmployeeRole } from '../types/database'

export function Employees() {
  const [employees, setEmployees] = useState<EmployeeWithRole[]>([])
  const [roles, setRoles] = useState<EmployeeRole[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showRolesModal, setShowRolesModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithRole | null>(null)
  const [editingRole, setEditingRole] = useState<EmployeeRole | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role_id: ''
  })
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    hourly_rate: '',
    description: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [employeesRes, rolesRes] = await Promise.all([
      supabase
        .from('employees')
        .select('*, employee_roles(*)')
        .eq('is_active', true)
        .order('last_name'),
      supabase.from('employee_roles').select('*').order('hourly_rate', { ascending: false })
    ])

    setEmployees((employeesRes.data as EmployeeWithRole[]) || [])
    setRoles(rolesRes.data || [])
    setLoading(false)
  }

  const filteredEmployees = employees.filter(e => {
    const search = searchTerm.toLowerCase()
    return (
      e.first_name.toLowerCase().includes(search) ||
      e.last_name.toLowerCase().includes(search) ||
      e.employee_roles?.name.toLowerCase().includes(search)
    )
  })

  function openModal(employee?: EmployeeWithRole) {
    if (employee) {
      setEditingEmployee(employee)
      setFormData({
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email || '',
        phone: employee.phone || '',
        role_id: employee.role_id || ''
      })
    } else {
      setEditingEmployee(null)
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role_id: ''
      })
    }
    setShowModal(true)
  }

  function openRoleModal(role?: EmployeeRole) {
    if (role) {
      setEditingRole(role)
      setRoleFormData({
        name: role.name,
        hourly_rate: role.hourly_rate.toString(),
        description: role.description || ''
      })
    } else {
      setEditingRole(null)
      setRoleFormData({
        name: '',
        hourly_rate: '',
        description: ''
      })
    }
    setShowRolesModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const data = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email || null,
      phone: formData.phone || null,
      role_id: formData.role_id || null
    }

    if (editingEmployee) {
      await supabase
        .from('employees')
        .update(data)
        .eq('id', editingEmployee.id)
    } else {
      await supabase
        .from('employees')
        .insert(data)
    }

    setShowModal(false)
    loadData()
  }

  async function handleRoleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const data = {
      name: roleFormData.name,
      hourly_rate: parseFloat(roleFormData.hourly_rate),
      description: roleFormData.description || null
    }

    if (editingRole) {
      await supabase
        .from('employee_roles')
        .update(data)
        .eq('id', editingRole.id)
    } else {
      await supabase
        .from('employee_roles')
        .insert(data)
    }

    setShowRolesModal(false)
    loadData()
  }

  async function handleDelete(id: string) {
    if (confirm('Mitarbeiter wirklich loeschen?')) {
      await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', id)
      loadData()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Mitarbeiter</h2>
          <p className="text-slate-500 mt-1">Verwalte Mitarbeiter und Stundensaetze</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openRoleModal()}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Euro className="w-4 h-4" />
            Rollen verwalten
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neuer Mitarbeiter
          </button>
        </div>
      </div>

      {/* Roles Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <h3 className="text-sm font-medium text-slate-500 mb-3">Stundensaetze nach Rolle</h3>
        <div className="flex flex-wrap gap-2">
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => openRoleModal(role)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm hover:bg-slate-200 transition-colors"
            >
              <span className="font-medium text-slate-700">{role.name}</span>
              <span className="text-slate-500">{role.hourly_rate.toFixed(2)} EUR/Std.</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Mitarbeiter suchen..."
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
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Rolle</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Kontakt</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">Stundensatz</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Lade Mitarbeiter...
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Keine Mitarbeiter gefunden
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">
                      {employee.first_name} {employee.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 rounded-full text-sm text-slate-700">
                      {employee.employee_roles?.name || 'Keine Rolle'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {employee.email && <div>{employee.email}</div>}
                    {employee.phone && <div>{employee.phone}</div>}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {employee.employee_roles
                      ? `${employee.employee_roles.hourly_rate.toFixed(2)} EUR/Std.`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openModal(employee)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(employee.id)}
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

      {/* Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingEmployee ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vorname *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nachname *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rolle</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Keine --</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name} ({role.hourly_rate.toFixed(2)} EUR/Std.)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                  {editingEmployee ? 'Speichern' : 'Anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRolesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingRole ? 'Rolle bearbeiten' : 'Neue Rolle'}
              </h3>
              <button
                onClick={() => setShowRolesModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleRoleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rollenbezeichnung *</label>
                <input
                  type="text"
                  required
                  value={roleFormData.name}
                  onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Meister, Geselle, Azubi..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stundensatz (EUR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={roleFormData.hourly_rate}
                  onChange={(e) => setRoleFormData({ ...roleFormData, hourly_rate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beschreibung</label>
                <textarea
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRolesModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingRole ? 'Speichern' : 'Anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
