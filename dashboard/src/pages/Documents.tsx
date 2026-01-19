import { useEffect, useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, Trash2, Download, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Document, Customer } from '../types/database'

export function Documents() {
  const [documents, setDocuments] = useState<(Document & { customers: Customer | null })[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [filesToUpload, setFilesToUpload] = useState<File[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [docsRes, customersRes] = await Promise.all([
      supabase
        .from('documents')
        .select('*, customers(*)')
        .order('uploaded_at', { ascending: false }),
      supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('company_name')
    ])

    setDocuments((docsRes.data as (Document & { customers: Customer | null })[]) || [])
    setCustomers(customersRes.data || [])
    setLoading(false)
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFilesToUpload(acceptedFiles)
    setShowUploadModal(true)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  })

  async function handleUpload() {
    if (filesToUpload.length === 0) return

    setUploading(true)

    for (const file of filesToUpload) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const filePath = `uploads/${fileName}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }

      // Save metadata to database
      await supabase.from('documents').insert({
        filename: fileName,
        original_filename: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        customer_id: selectedCustomer || null,
        description: uploadDescription || null
      })
    }

    setUploading(false)
    setShowUploadModal(false)
    setFilesToUpload([])
    setSelectedCustomer('')
    setUploadDescription('')
    loadData()
  }

  async function handleDelete(doc: Document) {
    if (!confirm('Dokument wirklich loeschen?')) return

    await supabase.storage.from('documents').remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    loadData()
  }

  async function handleDownload(doc: Document) {
    const { data } = await supabase.storage
      .from('documents')
      .download(doc.file_path)

    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.original_filename
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const search = searchTerm.toLowerCase()
    return (
      doc.original_filename.toLowerCase().includes(search) ||
      doc.description?.toLowerCase().includes(search) ||
      doc.customers?.company_name?.toLowerCase().includes(search) ||
      doc.customers?.last_name?.toLowerCase().includes(search)
    )
  })

  function formatFileSize(bytes: number | null) {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dokumente</h2>
          <p className="text-slate-500 mt-1">Lade Dokumente hoch und verwalte sie</p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 mb-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-blue-500' : 'text-slate-400'}`} />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Dateien hier ablegen...</p>
        ) : (
          <>
            <p className="text-slate-600 font-medium mb-1">
              Dateien hier ablegen oder klicken zum Auswaehlen
            </p>
            <p className="text-sm text-slate-400">
              PDF, Bilder, Word, Excel
            </p>
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Dokumente suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Datei</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Kunde</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Groesse</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Hochgeladen</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Lade Dokumente...
                </td>
              </tr>
            ) : filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Keine Dokumente gefunden
                </td>
              </tr>
            ) : (
              filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <File className="w-8 h-8 text-slate-400" />
                      <div>
                        <div className="font-medium text-slate-800">{doc.original_filename}</div>
                        {doc.description && (
                          <div className="text-sm text-slate-500">{doc.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {doc.customers
                      ? doc.customers.company_name || `${doc.customers.first_name} ${doc.customers.last_name}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {formatDate(doc.uploaded_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {filesToUpload.length} {filesToUpload.length === 1 ? 'Datei' : 'Dateien'} hochladen
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setFilesToUpload([])
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Files List */}
              <div className="space-y-2">
                {filesToUpload.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                    <File className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-700 truncate flex-1">{file.name}</span>
                    <span className="text-xs text-slate-400">{formatFileSize(file.size)}</span>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kunde zuordnen</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Kein Kunde --</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.company_name || `${customer.first_name} ${customer.last_name}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beschreibung</label>
                <input
                  type="text"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Optional: Kurze Beschreibung"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false)
                    setFilesToUpload([])
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
