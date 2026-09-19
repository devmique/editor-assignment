'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import {
  FileText, ArrowLeft, Bold, Italic, UnderlineIcon, List, ListOrdered,
  Heading1, Heading2, Undo2, Redo2, Share2, Trash2, X, LogOut, ChevronDown,
  Search, Check, Eye, MessageSquare, Pencil, AlertTriangle, Send, MessageCircle
} from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

type DocumentData = { id: string; title: string; owner_id: string; content: string; permission: 'owner' | 'edit' | 'comment' | 'view' }
type ShareUser = { id: string; email: string; full_name: string }
type ExistingShare = { user_id: string; email: string; full_name: string; permission: 'edit' | 'comment' | 'view' }
type Comment = { id: string; content: string; user_id: string; user_email: string; user_name: string; created_at: string; resolved: boolean }

function ToolbarButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} aria-pressed={active} title={label} onClick={onClick} className={`toolbar-button ${active ? 'is-active' : ''}`}>{children}</button>
}

const PERM_OPTIONS = [
  { value: 'edit' as const, label: 'Can edit', icon: Pencil },
  { value: 'comment' as const, label: 'Can comment', icon: MessageSquare },
  { value: 'view' as const, label: 'Can view', icon: Eye },
]

function timeAgo(dateStr: string) {
  const d = new Date(dateStr); const now = new Date(); const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'Just now'; if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`; return `${Math.floor(diff/86400)}d ago`
}

export default function EditorPage() {
  const router = useRouter()
  const params = useParams()
  const docId = params.id as string
  const supabase = createClient()

  const [doc, setDoc] = useState<DocumentData | null>(null)
  const [title, setTitle] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('Saved')
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)
  const [shareSearch, setShareSearch] = useState('')
  const [shareResults, setShareResults] = useState<ShareUser[]>([])
  const [existingShares, setExistingShares] = useState<ExistingShare[]>([])
  const [selectedUser, setSelectedUser] = useState<ShareUser | null>(null)
  const [selectedPermission, setSelectedPermission] = useState<'edit' | 'comment' | 'view'>('edit')
  const [permDropdownOpen, setPermDropdownOpen] = useState(false)
  const [activeShareMenu, setActiveShareMenu] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const permRef = useRef<HTMLDivElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const shareSearchRef = useRef<HTMLInputElement>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (!user) { router.push('/login'); return }
      loadDocument(user.id)
    })
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
      if (permRef.current && !permRef.current.contains(e.target as Node)) setPermDropdownOpen(false)
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) setActiveShareMenu(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadDocument(userId: string) {
    const { data, error } = await supabase.from('documents').select('*').eq('id', docId).single()
    if (error || !data) { toast.error('Document not found'); router.push('/'); return }
    const isOwner = data.owner_id === userId
    let permission: DocumentData['permission'] = 'owner'
    if (!isOwner) {
      const { data: share } = await supabase.from('document_shares').select('permission').eq('document_id', docId).eq('user_id', userId).single()
      if (share) { permission = share.permission as any } else { toast.error('Access denied'); router.push('/'); return }
    }
    setDoc({ id: data.id, title: data.title, owner_id: data.owner_id, content: data.content || '', permission })
    setTitle(data.title)
    setLoading(false)
  }

  const editor = useEditor({
    extensions: [StarterKit, Underline, Placeholder.configure({ placeholder: 'Start writing...' })],
    content: '',
    immediatelyRender: false,
    editable: true,
    onUpdate: ({ editor: instance }) => {
      setStatus('Saving')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        await supabase.from('documents').update({ content: instance.getHTML(), updated_at: new Date().toISOString() }).eq('id', docId)
        setStatus('Saved')
      }, 500)
    },
  }, [docId])

  useEffect(() => {
    if (editor && doc) {
      editor.setEditable(doc.permission === 'owner' || doc.permission === 'edit')
      if (editor.getHTML() !== doc.content) {
        editor.commands.setContent(doc.content, false)
      }
    }
  }, [editor, doc])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); editor?.destroy() }, [editor])

  async function updateTitle(value: string) {
    setTitle(value)
    await supabase.from('documents').update({ title: value || 'Untitled document', updated_at: new Date().toISOString() }).eq('id', docId)
  }

  async function deleteDocument() {
    const { error } = await supabase.from('documents').delete().eq('id', docId)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Document deleted'); router.push('/')
  }

  // -- Comments --
  async function loadComments() {
    const { data } = await supabase.from('comments').select('*').eq('document_id', docId).order('created_at', { ascending: true })
    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))]
      const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').in('id', userIds)
      const profileMap = new Map((profiles || []).map(p => [p.id, p]))
      setComments(data.map(c => {
        const p = profileMap.get(c.user_id)
        return { ...c, user_email: p?.email || 'Unknown', user_name: p?.full_name || '' }
      }))
    }
  }

  async function addComment() {
    if (!newComment.trim() || !user) return
    setSendingComment(true)
    const { error } = await supabase.from('comments').insert({ document_id: docId, user_id: user.id, content: newComment.trim() })
    if (error) { toast.error('Failed to post comment'); setSendingComment(false); return }
    setNewComment(''); setSendingComment(false); loadComments()
  }

  async function resolveComment(commentId: string, resolved: boolean) {
    await supabase.from('comments').update({ resolved: !resolved }).eq('id', commentId)
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved: !resolved } : c))
  }

  async function deleteComment(commentId: string) {
    await supabase.from('comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  useEffect(() => { if (commentOpen) loadComments() }, [commentOpen])

  // -- Shares --
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) { setShareResults([]); return }
    const { data } = await supabase.from('profiles').select('id, email, full_name').ilike('email', `%${query}%`).neq('id', user?.id).limit(8)
    if (data) setShareResults(data.filter(u => !existingShares.find(s => s.user_id === u.id)))
  }, [supabase, user, existingShares])

  useEffect(() => { const t = setTimeout(() => searchUsers(shareSearch), 200); return () => clearTimeout(t) }, [shareSearch])

  async function loadShares() {
    const { data } = await supabase.from('document_shares').select('user_id, permission, profiles!inner(id, email, full_name)').eq('document_id', docId)
    if (data) setExistingShares(data.map((s: any) => ({ user_id: s.user_id, email: s.profiles?.email || 'Unknown', full_name: s.profiles?.full_name || '', permission: s.permission })))
  }

  async function addShare() {
    if (!selectedUser) return
    const { error } = await supabase.from('document_shares').insert({ document_id: docId, user_id: selectedUser.id, permission: selectedPermission })
    if (error) { if (error.code === '23505') return toast.error('Already shared'); return toast.error('Failed') }
    setExistingShares(prev => [...prev, { user_id: selectedUser.id, email: selectedUser.email, full_name: selectedUser.full_name, permission: selectedPermission }])
    setSelectedUser(null); setShareSearch(''); setShareResults([]); toast.success('Shared')
  }

  async function updateSharePerm(userId: string, perm: 'edit' | 'comment' | 'view') {
    const { error } = await supabase.from('document_shares').update({ permission: perm }).eq('document_id', docId).eq('user_id', userId)
    if (error) return toast.error('Failed')
    setExistingShares(prev => prev.map(s => s.user_id === userId ? { ...s, permission: perm } : s)); setActiveShareMenu(null)
  }

  async function removeShare(userId: string) {
    const { error } = await supabase.from('document_shares').delete().eq('document_id', docId).eq('user_id', userId)
    if (error) return toast.error('Failed')
    setExistingShares(prev => prev.filter(s => s.user_id !== userId)); toast.success('Removed')
  }

  useEffect(() => { if (shareOpen) { loadShares(); setShareSearch(''); setSelectedUser(null); setShareResults([]) } }, [shareOpen])

  if (loading || !doc) return <div className="editor-page"><div className="editor-page-loading">Loading...</div></div>

  const canEdit = doc.permission === 'owner' || doc.permission === 'edit'
  const canComment = canEdit || doc.permission === 'comment'
  const initials = (user?.user_metadata?.full_name || user?.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const unresolvedCount = comments.filter(c => !c.resolved).length

  return (
    <div className="editor-page">
      <header className="editor-topbar">
        <div className="editor-topbar-inner">
          <div className="editor-topbar-left">
            <button className="editor-back" onClick={() => router.push('/')} title="Back"><ArrowLeft style={{ width: 18, height: 18 }} /></button>
            <FileText className="editor-brand-icon" />
            <input ref={titleInputRef} className="editor-title-input" value={title} onChange={(e) => updateTitle(e.target.value)} disabled={!canEdit} placeholder="Untitled document" />
            <span className="save-status"><span className={status === 'Saved' ? 'saved-dot' : 'saving-dot'} />{status}</span>
          </div>
          <div className="editor-topbar-right">
            <button className={`comment-toggle-btn ${commentOpen ? 'active' : ''}`} onClick={() => setCommentOpen(!commentOpen)} title="Comments">
              <MessageCircle style={{ width: 16, height: 16 }} />
              {unresolvedCount > 0 && <span className="comment-badge">{unresolvedCount}</span>}
            </button>
            {canComment && <>
              <button className="share-btn" onClick={() => setShareOpen(true)}><Share2 style={{ width: 15, height: 15 }} /><span>Share</span></button>
              {doc.owner_id === user?.id && <button className="editor-delete-btn" onClick={() => setDeleteOpen(true)} title="Delete"><Trash2 style={{ width: 15, height: 15 }} /></button>}
            </>}
            <div className="user-menu" ref={dropdownRef}>
              <button onClick={() => setDropdownOpen(!dropdownOpen)} className="editor-user-btn"><span className="avatar avatar-sm">{initials}</span><ChevronDown style={{ width: 14 }} /></button>
              {dropdownOpen && <div className="user-dropdown">
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.user_metadata?.full_name || 'User'}</div>
                  <div style={{ fontSize: 12, color: '#69707d' }}>{user?.email}</div>
                  <div style={{ fontSize: 11, color: '#9aa1aa', marginTop: 2 }}>{doc.permission === 'owner' ? 'Owner' : `Permission: ${doc.permission}`}</div>
                </div>
                <button className="user-dropdown-item" onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}><LogOut style={{ width: 16, height: 16 }} /> Sign out</button>
              </div>}
            </div>
          </div>
        </div>
      </header>

      <div className="editor-body">
        <div className={`editor-main ${commentOpen ? 'with-sidebar' : ''}`}>
          <div className="editor-toolbar-wrap">
            <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
              <ToolbarButton label="Undo" onClick={() => editor?.chain().focus().undo().run()}><Undo2 /></ToolbarButton>
              <ToolbarButton label="Redo" onClick={() => editor?.chain().focus().redo().run()}><Redo2 /></ToolbarButton>
              <span className="toolbar-divider" />
              <ToolbarButton label="Heading 1" active={editor?.isActive('heading', { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 /></ToolbarButton>
              <ToolbarButton label="Heading 2" active={editor?.isActive('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 /></ToolbarButton>
              <span className="toolbar-divider" />
              <ToolbarButton label="Bold" active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold /></ToolbarButton>
              <ToolbarButton label="Italic" active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic /></ToolbarButton>
              <ToolbarButton label="Underline" active={editor?.isActive('underline')} onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon /></ToolbarButton>
              <span className="toolbar-divider" />
              <ToolbarButton label="Bulleted list" active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List /></ToolbarButton>
              <ToolbarButton label="Numbered list" active={editor?.isActive('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered /></ToolbarButton>
              {!canEdit && <span className="editor-readonly-badge">View only</span>}
            </div>
          </div>
          <main className="editor-content"><div className="page-wrap"><EditorContent editor={editor} /></div></main>
        </div>

        {commentOpen && (
          <aside className="comment-sidebar">
            <div className="comment-sidebar-header">
              <h3>Comments <span className="comment-count">{unresolvedCount > 0 ? unresolvedCount : ''}</span></h3>
              <button className="comment-close" onClick={() => setCommentOpen(false)}><X style={{ width: 16, height: 16 }} /></button>
            </div>

            {canComment && (
              <div className="comment-input-wrap">
                <div className="avatar avatar-sm">{initials}</div>
                <div className="comment-input-area">
                  <textarea ref={commentInputRef} className="comment-input" placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() } }} rows={2} />
                  <button className="comment-send" onClick={addComment} disabled={!newComment.trim() || sendingComment}><Send style={{ width: 14, height: 14 }} /></button>
                </div>
              </div>
            )}

            <div className="comment-list">
              {comments.length === 0 && <div className="comment-empty">No comments yet</div>}
              {comments.map(c => (
                <div key={c.id} className={`comment-item ${c.resolved ? 'resolved' : ''}`}>
                  <div className="comment-item-header">
                    <span className="avatar avatar-sm">{(c.user_name || c.user_email)[0].toUpperCase()}</span>
                    <div className="comment-meta">
                      <span className="comment-author">{c.user_name || c.user_email}</span>
                      <span className="comment-time">{timeAgo(c.created_at)}</span>
                    </div>
                    {c.user_id === user?.id && (
                      <button className="comment-delete" onClick={() => deleteComment(c.id)} title="Delete"><X style={{ width: 12, height: 12 }} /></button>
                    )}
                  </div>
                  <p className="comment-text">{c.content}</p>
                  <div className="comment-actions">
                    <button className={`comment-resolve-btn ${c.resolved ? 'resolved' : ''}`} onClick={() => resolveComment(c.id, c.resolved)}>
                      <Check style={{ width: 12, height: 12 }} />{c.resolved ? 'Resolved' : 'Resolve'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {deleteOpen && <div className="modal-backdrop" onMouseDown={() => setDeleteOpen(false)}>
        <div className="confirm-dialog" onMouseDown={e => e.stopPropagation()}>
          <div className="confirm-icon"><AlertTriangle style={{ width: 28, height: 28, color: '#b42318' }} /></div>
          <h3>Delete this document?</h3>
          <p>&ldquo;{title}&rdquo; will be permanently deleted. This cannot be undone.</p>
          <div className="confirm-actions">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteDocument}>Delete</Button>
          </div>
        </div>
      </div>}

      {shareOpen && <div className="modal-backdrop" onMouseDown={() => setShareOpen(false)}>
        <div className="share-dialog" onMouseDown={e => e.stopPropagation()}>
          <div className="dialog-header">
            <div><h2>Share &ldquo;{title}&rdquo;</h2><p>Invite someone to access this document.</p></div>
            <button className="close-button" onClick={() => setShareOpen(false)}><X /></button>
          </div>
          <div className="share-search-wrap">
            <div className="share-search-row">
              <div className="share-search-input-wrap">
                <Search style={{ width: 16, height: 16, color: '#9aa1aa', flexShrink: 0 }} />
                <input ref={shareSearchRef} className="share-search-input" type="email" placeholder="Search by email..." value={shareSearch} onChange={e => { setShareSearch(e.target.value); setSelectedUser(null) }} onKeyDown={e => { if (e.key === 'Enter' && shareResults.length > 0) setSelectedUser(shareResults[0]) }} />
              </div>
              <div className="share-perm-select" ref={permRef}>
                <button className="share-perm-btn" onClick={() => setPermDropdownOpen(!permDropdownOpen)}>
                  {PERM_OPTIONS.find(p => p.value === selectedPermission)?.label} <ChevronDown style={{ width: 14, height: 14 }} />
                </button>
                {permDropdownOpen && <div className="share-perm-dropdown">
                  {PERM_OPTIONS.map(opt => <button key={opt.value} className={`share-perm-option ${selectedPermission === opt.value ? 'active' : ''}`} onClick={() => { setSelectedPermission(opt.value); setPermDropdownOpen(false) }}><opt.icon style={{ width: 14, height: 14 }} />{opt.label}</button>)}
                </div>}
              </div>
            </div>
            {shareSearch.length >= 2 && <div className="share-results">
              {shareResults.length === 0 && <div className="share-empty">No users found</div>}
              {shareResults.map(u => <button key={u.id} className="share-result-item" onClick={() => { setSelectedUser(u); setShareSearch(u.email); setShareResults([]) }}>
                <span className="avatar avatar-sm">{(u.full_name || u.email)[0].toUpperCase()}</span>
                <div className="share-result-info"><span className="share-result-email">{u.email}</span>{u.full_name && <span className="share-result-name">{u.full_name}</span>}</div>
              </button>)}
            </div>}
            {selectedUser && <div className="share-selected">
              <span className="avatar avatar-sm">{(selectedUser.full_name || selectedUser.email)[0].toUpperCase()}</span>
              <span className="share-selected-email">{selectedUser.email}</span>
              <button className="share-add-btn" onClick={addShare}><Check style={{ width: 16, height: 16 }} /> Add</button>
            </div>}
          </div>
          {existingShares.length > 0 && <div className="share-existing">
            <div className="share-existing-label">People with access</div>
            {existingShares.map(s => <div key={s.user_id} className="share-existing-row">
              <span className="avatar avatar-sm">{(s.full_name || s.email)[0].toUpperCase()}</span>
              <div className="share-existing-info"><span className="share-existing-email">{s.email}</span>{s.full_name && <span className="share-existing-name">{s.full_name}</span>}</div>
              <div className="share-existing-actions" ref={activeShareMenu === s.user_id ? shareMenuRef : undefined}>
                <button className="share-existing-perm" onClick={() => setActiveShareMenu(activeShareMenu === s.user_id ? null : s.user_id)}>
                  {PERM_OPTIONS.find(p => p.value === s.permission)?.label} <ChevronDown style={{ width: 12, height: 12 }} />
                </button>
                {activeShareMenu === s.user_id && <div className="share-perm-dropdown" style={{ right: 0, left: 'auto' }}>
                  {PERM_OPTIONS.map(opt => <button key={opt.value} className={`share-perm-option ${s.permission === opt.value ? 'active' : ''}`} onClick={() => updateSharePerm(s.user_id, opt.value)}><opt.icon style={{ width: 14, height: 14 }} />{opt.label}</button>)}
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  <button className="share-perm-option" style={{ color: '#b42318' }} onClick={() => removeShare(s.user_id)}><Trash2 style={{ width: 14, height: 14 }} />Remove</button>
                </div>}
              </div>
            </div>)}
          </div>}
        </div>
      </div>}

      <Toaster position="bottom-right" />
    </div>
  )
}
