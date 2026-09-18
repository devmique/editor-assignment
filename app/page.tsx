'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { FileText, FolderOpen, MoreHorizontal, Plus, Upload, Users, Bold, Italic, UnderlineIcon, List, ListOrdered, Heading1, Heading2, Undo2, Redo2, Check, Search, X, Share2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/ui/button'

type DocumentItem = { id: string; title: string; owner: string; updated: string; shared: boolean; content: string }

const initialDocuments: DocumentItem[] = [
  { id: '1', title: 'Product brief', owner: 'You', updated: 'Just now', shared: true, content: '<h1>Product brief</h1><p>Capture the problem we are solving, the people we are solving it for, and the smallest useful version of the product.</p><h2>Context</h2><p>Teams need a calm place to move shared work forward without losing the thread.</p>' },
  { id: '2', title: 'Research notes', owner: 'You', updated: 'Yesterday', shared: false, content: '<h1>Research notes</h1><p>Notes from customer conversations and internal interviews.</p><ul><li>People want fewer handoffs.</li><li>Search and sharing need to stay simple.</li></ul>' },
  { id: '3', title: 'Launch checklist', owner: 'Maya Chen', updated: 'Mar 18, 2026', shared: true, content: '<h1>Launch checklist</h1><p>Review this list before the release.</p><ol><li>Confirm scope</li><li>Run the smoke test</li><li>Share the release note</li></ol>' },
]

function ToolbarButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} aria-pressed={active} title={label} onClick={onClick} className={`toolbar-button ${active ? 'is-active' : ''}`}>{children}</button>
}

function Editor({ document, onSave }: { document: DocumentItem; onSave: (content: string) => void }) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [status, setStatus] = useState('Saved')
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Start writing…' })],
    content: document.content,
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => {
      setStatus('Saving')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => { onSave(instance.getHTML()); setStatus('Saved') }, 500)
    },
  }, [document.id])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); editor?.destroy() }, [editor])
  useEffect(() => { if (editor && editor.getHTML() !== document.content) editor.commands.setContent(document.content) }, [document.id])

  if (!editor) return <div className="editor-loading">Loading editor…</div>
  return <>
    <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
      <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 /></ToolbarButton>
      <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 /></ToolbarButton>
      <span className="toolbar-divider" />
      <ToolbarButton label="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 /></ToolbarButton>
      <ToolbarButton label="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 /></ToolbarButton>
      <span className="toolbar-divider" />
      <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></ToolbarButton>
      <ToolbarButton label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon /></ToolbarButton>
      <span className="toolbar-divider" />
      <ToolbarButton label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></ToolbarButton>
      <ToolbarButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered /></ToolbarButton>
      <span className="save-status"><span className={status === 'Saved' ? 'saved-dot' : 'saving-dot'} />{status}</span>
    </div>
    <div className="page-wrap"><EditorContent editor={editor} /></div>
  </>
}

export default function Page() {
  const [documents, setDocuments] = useState(initialDocuments)
  const [selectedId, setSelectedId] = useState('1')
  const [filter, setFilter] = useState<'all' | 'owned' | 'shared'>('all')
  const [query, setQuery] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [uploadError, setUploadError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const selected = documents.find((doc) => doc.id === selectedId) ?? documents[0]
  const visibleDocuments = useMemo(() => documents.filter((doc) => (filter === 'owned' ? doc.owner === 'You' : filter === 'shared' ? doc.shared : true)).filter((doc) => doc.title.toLowerCase().includes(query.toLowerCase())), [documents, filter, query])

  function createDocument() {
    const newDocument = { id: crypto.randomUUID(), title: 'Untitled document', owner: 'You', updated: 'Just now', shared: false, content: '<h1>Untitled document</h1><p></p>' }
    setDocuments((current) => [newDocument, ...current]); setSelectedId(newDocument.id); toast.success('Document created')
  }
  function updateTitle(value: string) { setDocuments((current) => current.map((doc) => doc.id === selected.id ? { ...doc, title: value || 'Untitled document', updated: 'Just now' } : doc)) }
  function updateContent(content: string) { setDocuments((current) => current.map((doc) => doc.id === selected.id ? { ...doc, content, updated: 'Just now' } : doc)) }
  function handleUpload(file?: File) {
    setUploadError('')
    if (!file) return
    const allowed = ['text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type) && !file.name.endsWith('.md')) return setUploadError('Unsupported file. Choose a .txt, .md, or .docx file.')
    if (file.size > 5 * 1024 * 1024) return setUploadError('That file is larger than 5 MB.')
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return setUploadError('DOCX import is coming next. Upload a .txt or .md file for now.')
    const reader = new FileReader(); reader.onload = () => { const title = file.name.replace(/\.(txt|md)$/i, '') || 'Imported document'; const imported = { id: crypto.randomUUID(), title, owner: 'You', updated: 'Just now', shared: false, content: `<h1>${title}</h1><p>${String(reader.result).replace(/</g, '&lt;').replace(/\n/g, '</p><p>')}</p>` }; setDocuments((current) => [imported, ...current]); setSelectedId(imported.id); toast.success('File imported') }; reader.onerror = () => setUploadError('The file could not be read. Try another file.'); reader.readAsText(file)
  }
  function shareDocument() { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareEmail)) return toast.error('Enter a valid email address'); setDocuments((current) => current.map((doc) => doc.id === selected.id ? { ...doc, shared: true } : doc)); setShareOpen(false); setShareEmail(''); toast.success(`Shared with ${shareEmail}`) }

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><FileText /> <span>Draftwork</span></div><div className="topbar-user"><span className="avatar">JM</span><span>Johnlord Mique</span></div></header>
    <div className="workspace">
      <aside className="sidebar"><div className="sidebar-actions"><Button onClick={createDocument}><Plus data-icon="inline-start" />New document</Button><Button variant="outline" onClick={() => fileInput.current?.click()}><Upload data-icon="inline-start" />Upload file</Button><input ref={fileInput} type="file" hidden accept=".txt,.md,.docx" onChange={(event) => handleUpload(event.target.files?.[0])} /></div><p className="helper">Supported: .txt, .md, .docx · 5 MB max</p>{uploadError && <div className="inline-error" role="alert">{uploadError}</div>}<nav className="side-nav"><button className="side-nav-item active"><FolderOpen />All documents <span>{documents.length}</span></button><button className="side-nav-item"><Users />Shared with me <span>{documents.filter((doc) => doc.shared && doc.owner !== 'You').length}</span></button></nav><div className="sidebar-footer">Draftwork · Interview build</div></aside>
      <section className="content-area"><div className="list-header"><div><p className="eyebrow">Workspace</p><h1>Documents</h1></div><div className="list-actions"><div className="search"><Search /><input aria-label="Search documents" placeholder="Search documents" value={query} onChange={(event) => setQuery(event.target.value)} /></div><Button onClick={createDocument}><Plus data-icon="inline-start" />New document</Button></div></div><div className="filters" role="tablist"><button onClick={() => setFilter('all')} className={filter === 'all' ? 'filter-active' : ''}>All documents</button><button onClick={() => setFilter('owned')} className={filter === 'owned' ? 'filter-active' : ''}>Owned by me</button><button onClick={() => setFilter('shared')} className={filter === 'shared' ? 'filter-active' : ''}>Shared</button></div><div className="document-table"><div className="table-head"><span>Title</span><span className="owner-col">Owner</span><span>Last edited</span><span /></div>{visibleDocuments.length === 0 ? <div className="empty-state"><FileText /><p>No documents found.</p><Button variant="outline" onClick={createDocument}>Create a document</Button></div> : visibleDocuments.map((doc) => <button key={doc.id} className={`document-row ${doc.id === selectedId ? 'selected' : ''}`} onClick={() => setSelectedId(doc.id)}><span className="document-title"><FileText />{doc.title}{doc.shared && <span className="shared-badge">Shared</span>}</span><span className="owner-col">{doc.owner}</span><span>{doc.updated}</span><MoreHorizontal /></button>)}</div></section>
    </div>
    <section className="editor-drawer"><div className="editor-header"><div className="title-field"><input aria-label="Document title" value={selected.title} onChange={(event) => updateTitle(event.target.value)} /><span>Saved to workspace</span></div><div className="editor-actions"><Button variant="outline" onClick={() => setShareOpen(true)}><Share2 data-icon="inline-start" />Share</Button><Button variant="ghost" aria-label="More document actions"><MoreHorizontal /></Button></div></div><Editor document={selected} onSave={updateContent} /></section>
    {shareOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShareOpen(false)}><div className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title" onMouseDown={(event) => event.stopPropagation()}><div className="dialog-header"><div><h2 id="share-title">Share “{selected.title}”</h2><p>Invite someone to view and edit this document.</p></div><button className="close-button" aria-label="Close share dialog" onClick={() => setShareOpen(false)}><X /></button></div><label className="field-label" htmlFor="share-email">Email address</label><input id="share-email" className="dialog-input" type="email" placeholder="name@company.com" value={shareEmail} onChange={(event) => setShareEmail(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') shareDocument() }} /><div className="dialog-actions"><Button variant="outline" onClick={() => setShareOpen(false)}>Cancel</Button><Button onClick={shareDocument}>Share</Button></div></div></div>}
    <Toaster position="bottom-right" />
  </main>
}
