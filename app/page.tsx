'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, FolderOpen, Plus, Upload, Users,
  Search, LogOut, ChevronDown, Pencil, Trash2, X, AlertTriangle, MoreVertical
} from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

type DocumentItem = {
  id: string
  title: string
  owner_id: string
  owner_email: string
  updated: string
  shared: boolean
  permission?: 'owner' | 'edit' | 'view'
}

export default function Page() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [filter, setFilter] = useState<'all' | 'owned' | 'shared'>('all')
  const [query, setQuery] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('')
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const rowMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const visibleDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        if (filter === 'owned') return doc.owner_id === user?.id
        if (filter === 'shared') return doc.shared
        return true
      })
      .filter((doc) => doc.title.toLowerCase().includes(query.toLowerCase()))
  }, [documents, filter, query, user])

  const loadDocuments = useCallback(async () => {
    if (!user) return

    const { data: ownedDocs } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })

    const { data: sharedDocs } = await supabase
      .from('document_shares')
      .select('*, documents(*)')
      .eq('user_id', user.id)

    const allDocs: DocumentItem[] = []

    if (ownedDocs) {
      ownedDocs.forEach((doc) => {
        allDocs.push({
          id: doc.id,
          title: doc.title,
          owner_id: doc.owner_id,
          owner_email: user.email || 'You',
          updated: formatTime(doc.updated_at),
          shared: false,
          content: doc.content || '',
          permission: 'owner',
        })
      })
    }

    if (sharedDocs) {
      for (const share of sharedDocs) {
        const doc = share.documents as any
        if (doc && !allDocs.find((d) => d.id === doc.id)) {
          allDocs.push({
            id: doc.id,
            title: doc.title,
            owner_id: doc.owner_id,
            owner_email: 'Shared',
            updated: formatTime(doc.updated_at),
            shared: true,
            content: doc.content || '',
            permission: share.permission as 'edit' | 'view',
          })
        }
      }
    }

    setDocuments(allDocs)
  }, [user, supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (user) loadDocuments()
  }, [user, loadDocuments])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
        setActiveRowMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  async function createDocument() {
    if (!user) return
    const { data, error } = await supabase
      .from('documents')
      .insert({ title: 'Untitled document', content: '<h1>Untitled document</h1><p></p>', owner_id: user.id })
      .select()
      .single()

    if (error) {
      console.error('Create document error:', error)
      toast.error(`Failed to create document: ${error.message}`)
      return
    }

    toast.success('Document created')
    router.push(`/editor/${data.id}`)
  }

  function openDocument(id: string) {
    router.push(`/editor/${id}`)
  }

  async function deleteDocument(docId: string) {
    const { error } = await supabase.from('documents').delete().eq('id', docId)
    if (error) { toast.error('Failed to delete'); return }
    setDocuments(prev => prev.filter(d => d.id !== docId))
    setDeleteConfirmId(null)
    toast.success('Document deleted')
  }

  function handleUpload(file?: File) {
    setUploadError('')
    if (!file) return
    const allowed = ['text/plain', 'text/markdown']
    if (!allowed.includes(file.type) && !file.name.endsWith('.md')) {
      return setUploadError('Unsupported file. Choose a .txt or .md file.')
    }
    if (file.size > 5 * 1024 * 1024) {
      return setUploadError('That file is larger than 5 MB.')
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const title = file.name.replace(/\.(txt|md)$/i, '') || 'Imported document'
      const raw = String(reader.result)
      const paragraphs = raw.split(/\n\n+/).filter(p => p.trim())
      const body = paragraphs.map(p => {
        const escaped = p.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
        return `<p>${escaped}</p>`
      }).join('')
      const htmlContent = `<h1>${title.replace(/</g, '&lt;')}</h1>${body || '<p></p>'}`

      if (!user) return
      const { data, error } = await supabase
        .from('documents')
        .insert({ title, content: htmlContent, owner_id: user.id })
        .select()
        .single()

      if (error) {
        toast.error('Failed to import file')
        return
      }

      toast.success('File imported')
      router.push(`/editor/${data.id}`)
    }
    reader.onerror = () => setUploadError('The file could not be read. Try another file.')
    reader.readAsText(file)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-brand" style={{ justifyContent: 'center' }}>
            <FileText />
            <span>Draftwork</span>
          </div>
          <p className="auth-subtitle">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  const initials = (user.user_metadata?.full_name || user.email || 'U')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><FileText /> <span>Draftwork</span></div>
        <div className="topbar-user" style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'transparent', cursor: 'pointer', color: '#505762', fontSize: 13, fontWeight: 500 }}
          >
            <span className="avatar">{initials}</span>
            <span>{user.user_metadata?.full_name || user.email}</span>
            <ChevronDown style={{ width: 14 }} />
          </button>
          {dropdownOpen && (
            <div className="user-dropdown">
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#3c4043' }}>{user.user_metadata?.full_name || 'User'}</div>
                <div style={{ fontSize: 12, color: '#69707d' }}>{user.email}</div>
              </div>
              <button className="user-dropdown-item" onClick={handleSignOut}>
                <LogOut style={{ width: 16, height: 16 }} /> Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-actions">
            <Button onClick={createDocument}><Plus data-icon="inline-start" />New document</Button>
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              <Upload data-icon="inline-start" />Upload file
            </Button>
            <input ref={fileInput} type="file" hidden accept=".txt,.md"
              onChange={(event) => handleUpload(event.target.files?.[0])} />
          </div>
          <p className="helper">Supported: .txt, .md · 5 MB max</p>
          {uploadError && <div className="inline-error" role="alert">{uploadError}</div>}

          <nav className="side-nav">
            <button className={`side-nav-item ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              <FolderOpen />All documents <span>{documents.length}</span>
            </button>
            <button className={`side-nav-item ${filter === 'owned' ? 'active' : ''}`} onClick={() => setFilter('owned')}>
              <FileText />Owned by me <span>{documents.filter((d) => d.owner_id === user?.id).length}</span>
            </button>
            <button className={`side-nav-item ${filter === 'shared' ? 'active' : ''}`} onClick={() => setFilter('shared')}>
              <Users />Shared <span>{documents.filter((d) => d.shared).length}</span>
            </button>
          </nav>

          <div className="sidebar-footer">Draftwork · Interview build</div>
        </aside>

        <section className="content-area">
          <div className="list-header">
            <div>
              <p className="eyebrow">Workspace</p>
              <h1>Documents</h1>
            </div>
            <div className="list-actions">
              <div className="search">
                <Search />
                <input aria-label="Search documents" placeholder="Search documents"
                  value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <Button onClick={createDocument}><Plus data-icon="inline-start" />New document</Button>
            </div>
          </div>

          <div className="filters" role="tablist">
            <button onClick={() => setFilter('all')} className={filter === 'all' ? 'filter-active' : ''}>All documents</button>
            <button onClick={() => setFilter('owned')} className={filter === 'owned' ? 'filter-active' : ''}>Owned by me</button>
            <button onClick={() => setFilter('shared')} className={filter === 'shared' ? 'filter-active' : ''}>Shared</button>
          </div>

          <div className="document-table">
            <div className="table-head" style={{ gridTemplateColumns: 'minmax(240px, 1fr) 150px 140px 40px' }}>
              <span>Title</span>
              <span className="owner-col">Owner</span>
              <span>Last edited</span>
              <span />
            </div>
            {visibleDocuments.length === 0 ? (
              <div className="empty-state">
                <FileText />
                <p>No documents found.</p>
                <Button variant="outline" onClick={createDocument}>Create a document</Button>
              </div>
            ) : visibleDocuments.map((doc) => (
              <div key={doc.id} className="document-row" style={{ gridTemplateColumns: 'minmax(240px, 1fr) 150px 140px 40px', cursor: 'pointer' }}>
                <span className="document-title" onClick={() => openDocument(doc.id)}>
                  <FileText />
                  {doc.title}
                  {doc.shared && <span className="shared-badge">Shared</span>}
                  {doc.permission === 'edit' && !doc.shared && <span className="shared-badge" style={{ background: '#fef3c7', color: '#92400e' }}>Can edit</span>}
                </span>
                <span className="owner-col">{doc.owner_id === user?.id ? 'You' : doc.owner_email}</span>
                <span>{doc.updated}</span>
                {doc.owner_id === user?.id && (
                  <div className="row-actions" ref={activeRowMenu === doc.id ? rowMenuRef : undefined}>
                    <button className="row-menu-btn" onClick={(e) => { e.stopPropagation(); setActiveRowMenu(activeRowMenu === doc.id ? null : doc.id) }}>
                      <MoreVertical style={{ width: 16, height: 16 }} />
                    </button>
                    {activeRowMenu === doc.id && (
                      <div className="row-menu-dropdown">
                        <button className="row-menu-item" onClick={(e) => { e.stopPropagation(); openDocument(doc.id) }}>
                          <Pencil style={{ width: 14, height: 14 }} /> Edit document
                        </button>
                        <div className="row-menu-divider" />
                        <button className="row-menu-item row-menu-danger" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(doc.id); setDeleteConfirmTitle(doc.title); setActiveRowMenu(null) }}>
                          <Trash2 style={{ width: 14, height: 14 }} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {deleteConfirmId && (
        <div className="modal-backdrop" onMouseDown={() => setDeleteConfirmId(null)}>
          <div className="confirm-dialog" onMouseDown={e => e.stopPropagation()}>
            <div className="confirm-icon"><AlertTriangle style={{ width: 28, height: 28, color: '#b42318' }} /></div>
            <h3>Delete this document?</h3>
            <p>&ldquo;{deleteConfirmTitle}&rdquo; will be permanently deleted. This cannot be undone.</p>
            <div className="confirm-actions">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteDocument(deleteConfirmId)}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="bottom-right" />
    </main>
  )
}
