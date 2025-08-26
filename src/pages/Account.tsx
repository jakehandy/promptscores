import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../lib/useAuth'
import { supabase, PROMPT_TYPES, type PromptType } from '../lib/supabase'
import TagInput from '../components/TagInput'
import type { Database } from '../lib/database.types'

export default function Account() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [myPrompts, setMyPrompts] = useState<EditablePrompt[] | null>(null)
  const [page, setPage] = useState(1)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profileCreatedAt, setProfileCreatedAt] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)

  useEffect(() => { setError(null); setSuccess(null) }, [mode])

  // Load my prompts when user changes
  useEffect(() => {
    let mounted = true
    async function load() {
      if (!user) { setMyPrompts(null); return }
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!mounted) return
      if (error) {
        // eslint-disable-next-line no-console
        console.error(error)
        setMyPrompts([])
      } else {
        const typedRows = (data ?? []) as Database['public']['Tables']['prompts']['Row'][]
        setMyPrompts(typedRows.map(row => ({
          ...row,
          type: (row.type === 'System Prompt' ? 'Global Instruction' : (row.type === 'Chat Setup' ? 'Learning' : row.type)) as any,
          tags: row.tags ?? [],
          _dirty: false, _saving: false, _error: null, _saved: false,
        })))
      }
    }
    load()
    return () => { mounted = false }
  }, [user?.id])

  // Load my profile
  useEffect(() => {
    let active = true
    async function loadProfile() {
      if (!user) { setProfileName(''); setProfileCreatedAt(null); return }
      setProfileLoading(true)
      const res = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      if (!active) return
      const error = (res as any).error as any
      if (error) {
        // eslint-disable-next-line no-console
        console.error(error)
      }
      const row = (res as any).data as Database['public']['Tables']['profiles']['Row'] | null
      setProfileName(row?.display_name ?? '')
      setProfileCreatedAt(row?.created_at ?? null)
      setProfileLoading(false)
    }
    loadProfile()
    return () => { active = false }
  }, [user?.id])

  async function saveDisplayName() {
    if (!user) return
    setProfileSaving(true); setProfileError(null); setProfileSuccess(null)
    const value = profileName.trim()
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ display_name: value || null })
      .eq('id', user.id)
    setProfileSaving(false)
    if (error) { setProfileError(error.message); return }
    setProfileSuccess('Saved ✓')
    setTimeout(() => setProfileSuccess(null), 1400)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await (mode === 'signin' ? fn(email, password) : signUp(email, password, displayName.trim() || undefined))
    if (error) {
      setError(error.message ?? String(error))
    } else if (mode === 'signup') {
      setSuccess('Account created! Please check your email to confirm your address, then sign in.')
    }
    setBusy(false)
  }

  if (loading) return <div className="container"><div className="loading">Loading…</div></div>

  if (user) {
    const userId = user.id

    async function savePrompt(idx: number) {
      if (!myPrompts) return
      const p = myPrompts[idx]
      if (!p || p._saving) return
      setMyPrompts(list => {
        if (!list) return list
        const copy = [...list]
        copy[idx] = { ...copy[idx], _saving: true, _error: null, _saved: false }
        return copy
      })
      const { error } = await (supabase as any)
        .from('prompts')
        .update({ title: p.title.trim(), body: p.body.trim(), type: p.type, tags: p.tags ?? [] })
        .eq('id', p.id)
        .eq('user_id', userId)
      if (error) {
        setMyPrompts(list => {
          if (!list) return list
          const copy = [...list]
          copy[idx] = { ...copy[idx], _saving: false, _error: error.message }
          return copy
        })
      } else {
        setMyPrompts(list => {
          if (!list) return list
          const copy = [...list]
          copy[idx] = { ...copy[idx], _saving: false, _dirty: false, _error: null, _saved: true }
          return copy
        })
        // hide saved badge after delay
        setTimeout(() => {
          setMyPrompts(list => {
            if (!list) return list
            const copy = [...list]
            if (copy[idx]) copy[idx] = { ...copy[idx], _saved: false }
            return copy
          })
        }, 1400)
      }
    }

    function updateField<T extends keyof EditablePrompt>(idx: number, key: T, value: EditablePrompt[T]) {
      setMyPrompts(list => {
        if (!list) return list
        const copy = [...list]
        const item = { ...copy[idx], [key]: value, _dirty: true, _saved: false } as EditablePrompt
        copy[idx] = item
        return copy
      })
    }

    return (
      <div className="container narrow">
        <h1>Account</h1>
        <div className="card">
          <div className="row"><span className="muted">User ID</span><span className="mono">{user.id}</span></div>
          <div className="row"><span className="muted">Email</span><span>{user.email}</span></div>
        </div>
        <button className="btn" style={{ marginTop: 16 }} onClick={() => signOut()}>Sign out</button>

        <h2 style={{ marginTop: 24 }}>Profile</h2>
        <div className="card">
          {profileError && <p className="error">{profileError}</p>}
          <label className="field">
            <span>Display name</span>
            <input
              value={profileName}
              disabled={profileLoading}
              onChange={e => setProfileName(e.target.value)}
              placeholder={user.email ?? 'Your public name'}
            />
          </label>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted" style={{ fontSize: 12 }}>
              {profileCreatedAt ? `Profile created ${new Date(profileCreatedAt).toLocaleDateString()}` : ''}
            </span>
            <div>
              {profileSuccess && <span className="muted" style={{ marginRight: 10 }}>{profileSuccess}</span>}
              <button className="btn primary" onClick={saveDisplayName} disabled={profileSaving}>
                {profileSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        <h2 style={{ marginTop: 24 }}>My Prompts</h2>
        {myPrompts === null ? (
          <div className="loading">Loading your prompts…</div>
        ) : myPrompts.length === 0 ? (
          <p className="muted">You haven’t submitted any prompts yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(() => {
              const pageSize = 5
              const totalPages = Math.max(1, Math.ceil(myPrompts.length / pageSize))
              const currentPage = Math.min(page, totalPages)
              const start = (currentPage - 1) * pageSize
              const end = start + pageSize
              const items = myPrompts.slice(start, end).map((p, i) => ({ p, idx: start + i }))
              return (
                <>
                  {items.map(({ p, idx }) => (
                    <button key={p.id} className="card" style={{ textAlign: 'left' }} onClick={() => setSelectedIdx(idx)}>
                      <div className="row" style={{ alignItems: 'center' }}>
                        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{p.title || '(Untitled)'}</strong>
                        <span className="muted" style={{ fontSize: 12 }}>{p.created_at ? new Date(p.created_at).toLocaleString() : ''}</span>
                      </div>
                      <div className="row" style={{ alignItems: 'center' }}>
                        <span className="muted" style={{ fontSize: 12 }}>{(p.type as string)}{Array.isArray(p.tags) && p.tags.length ? ` • ${p.tags.length} tag${p.tags.length === 1 ? '' : 's'}` : ''}</span>
                        <span className="muted" style={{ fontSize: 12 }}>ID: <span className="mono">{p.id.slice(0, 8)}…</span></span>
                      </div>
                    </button>
                  ))}
                  <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
                    <button className="btn ghost" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
                    <span className="muted" style={{ fontSize: 12 }}>Page {currentPage} of {totalPages}</span>
                    <button className="btn ghost" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                  </div>
                </>
              )
            })()}
          </div>
        )}
        {selectedIdx !== null && myPrompts && myPrompts[selectedIdx] && createPortal(
          <div className="modal-backdrop" onClick={() => setSelectedIdx(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
              <h3>Edit Prompt</h3>
              {myPrompts[selectedIdx]._error && <p className="error">{myPrompts[selectedIdx]._error}</p>}
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <strong className="muted" style={{ fontSize: 12 }}>Prompt ID: <span className="mono">{myPrompts[selectedIdx].id.slice(0, 8)}…</span></strong>
                <span className="muted" style={{ fontSize: 12 }}>{myPrompts[selectedIdx].created_at ? new Date(myPrompts[selectedIdx].created_at!).toLocaleString() : ''}</span>
              </div>
              <label className="field">
                <span>Title</span>
                <input value={myPrompts[selectedIdx].title} onChange={e => updateField(selectedIdx, 'title', e.target.value)} />
              </label>
              <label className="field">
                <span>Type</span>
                <div className="select">
                  <select value={myPrompts[selectedIdx].type as PromptType} onChange={e => updateField(selectedIdx, 'type', e.target.value as PromptType)}>
                    {PROMPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </label>
              <label className="field">
                <span>Prompt</span>
                <textarea value={myPrompts[selectedIdx].body} rows={6} onChange={e => updateField(selectedIdx, 'body', e.target.value)} />
              </label>
              <label className="field">
                <span>Tags</span>
                <TagInput value={(myPrompts[selectedIdx].tags ?? []) as string[]} onChange={tags => updateField(selectedIdx, 'tags', tags)} />
              </label>
              <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                <div>
                  {myPrompts[selectedIdx]._saved && <span className="muted">Saved ✓</span>}
                  {myPrompts[selectedIdx]._dirty && !myPrompts[selectedIdx]._saved && <span className="muted">Unsaved changes</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn ghost" onClick={() => setSelectedIdx(null)}>Close</button>
                  <button
                    className="btn primary"
                    disabled={!myPrompts[selectedIdx].title.trim() || !myPrompts[selectedIdx].body.trim() || myPrompts[selectedIdx]._saving || !myPrompts[selectedIdx]._dirty}
                    onClick={() => savePrompt(selectedIdx!)}
                  >
                    {myPrompts[selectedIdx]._saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    )
  }

  return (
    <div className="container narrow">
      <h1>{mode === 'signin' ? 'Sign In' : 'Create Account'}</h1>
      {error && <p className="error">{error}</p>}
      {success && (
        <p className="muted" style={{ color: 'var(--success)' }}>{success}</p>
      )}
      <form className="card form" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
        </label>
        {mode === 'signup' && (
          <label className="field">
            <span>Display name (optional)</span>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="How you’ll appear publicly" />
          </label>
        )}
        <button className="btn primary" disabled={busy}>
          {busy ? 'Please wait…' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
        </button>
      </form>
      <p className="muted switch">
        {mode === 'signin' ? (
          <>
            No account? <button className="link" onClick={() => setMode('signup')}>Sign up</button>
          </>
        ) : (
          <>
            Have an account? <button className="link" onClick={() => setMode('signin')}>Sign in</button>
          </>
        )}
      </p>
    </div>
  )
}

type EditablePrompt = Database['public']['Tables']['prompts']['Row'] & {
  _dirty: boolean
  _saving: boolean
  _error: string | null
  _saved: boolean
}
