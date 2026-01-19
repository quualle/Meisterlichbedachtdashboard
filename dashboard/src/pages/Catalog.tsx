import { useEffect, useState } from 'react'
import { Search, FileText, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface MFDachPosition {
  id: string
  name: string
  short_text: string | null
  long_text: string | null
  unit: string | null
  source_file: string
  category_guid: string | null
}

interface MFDachCategory {
  id: string
  name: string
  source_guid: string | null
  parent_guid: string | null
}

export function Catalog() {
  const [positions, setPositions] = useState<MFDachPosition[]>([])
  const [categories, setCategories] = useState<MFDachCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPosition, setSelectedPosition] = useState<MFDachPosition | null>(null)
  const [sourceFilter, setSourceFilter] = useState<string>('')
  const [sourceFiles, setSourceFiles] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => {
    loadSourceFiles()
    loadCategories()
  }, [])

  useEffect(() => {
    loadPositions()
  }, [searchTerm, sourceFilter, page])

  async function loadSourceFiles() {
    const { data } = await supabase
      .from('mfdach_positions')
      .select('source_file')

    if (data) {
      const files = [...new Set(data.map(d => d.source_file))].sort()
      setSourceFiles(files)
    }
  }

  async function loadCategories() {
    const { data } = await supabase
      .from('mfdach_categories')
      .select('*')
      .order('name')

    setCategories(data || [])
  }

  async function loadPositions() {
    setLoading(true)

    let query = supabase
      .from('mfdach_positions')
      .select('*', { count: 'exact' })

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,long_text.ilike.%${searchTerm}%,short_text.ilike.%${searchTerm}%`)
    }

    if (sourceFilter) {
      query = query.eq('source_file', sourceFilter)
    }

    const { data, count } = await query
      .order('name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    setPositions(data || [])
    setTotalCount(count || 0)
    setLoading(false)
  }

  function getCategoryName(guid: string | null): string {
    if (!guid) return '-'
    const cat = categories.find(c => c.source_guid === guid)
    return cat?.name || '-'
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Leistungskatalog</h2>
          <p className="text-slate-500 mt-1">
            {totalCount.toLocaleString('de-DE')} Positionen aus MFDach
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Positionen durchsuchen..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(0)
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:w-64">
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value)
                setPage(0)
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Quelldateien</option>
              {sourceFiles.map(file => (
                <option key={file} value={file}>{file}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Position List */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Position</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Einheit</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Quelle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                      Lade Positionen...
                    </td>
                  </tr>
                ) : positions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                      Keine Positionen gefunden
                    </td>
                  </tr>
                ) : (
                  positions.map((pos) => (
                    <tr
                      key={pos.id}
                      onClick={() => setSelectedPosition(pos)}
                      className={`cursor-pointer hover:bg-slate-50 ${
                        selectedPosition?.id === pos.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 text-sm">{pos.name}</div>
                        {pos.short_text && (
                          <div className="text-xs text-slate-500 truncate max-w-md">
                            {pos.short_text}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {pos.unit || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {pos.source_file.replace('.POS', '').replace('.pos', '')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
              <div className="text-sm text-slate-500">
                Seite {page + 1} von {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-50"
                >
                  Zurück
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-50"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="w-96 bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-fit sticky top-20">
          {selectedPosition ? (
            <div>
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{selectedPosition.name}</h3>
                  {selectedPosition.short_text && (
                    <p className="text-sm text-slate-500 mt-1">{selectedPosition.short_text}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {selectedPosition.unit && (
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase">Einheit</span>
                    <p className="text-sm text-slate-700">{selectedPosition.unit}</p>
                  </div>
                )}

                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase">Kategorie</span>
                  <p className="text-sm text-slate-700">{getCategoryName(selectedPosition.category_guid)}</p>
                </div>

                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase">Quelle</span>
                  <p className="text-sm text-slate-700">{selectedPosition.source_file}</p>
                </div>

                {selectedPosition.long_text && (
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase">Beschreibung</span>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1 max-h-64 overflow-y-auto bg-slate-50 p-2 rounded">
                      {selectedPosition.long_text}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Position auswählen für Details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
