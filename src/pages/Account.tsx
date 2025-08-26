import { useEffect, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { supabase, PROMPT_TYPES, type PromptType } from '../lib/supabase'
import TagInput from '../components/TagInput'
import type { Database } from '../lib/database.types'

export default function Account() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [myPrompts, setMyPrompts] = useState<EditablePrompt[] | null>(null)

  useEffect(() => { setError(null) }, [mode])

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
          type: (row.type === 'Chat Setup' ? 'Learning' : row.type) as any,
          tags: row.tags ?? [],
          _dirty: false, _saving: false, _error: null, _saved: false,
        })))
      }
    }
    load()
    return () => { mounted = false }
  }, [user?.id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await fn(email, password)
    if (error) setError(error.message ?? String(error))
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
      const { error } = await supabase
        .from('prompts')
        .update<Database['public']['Tables']['prompts']['Update']>({ title: p.title.trim(), body: p.body.trim(), type: p.type, tags: p.tags ?? [] })
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
        <button className="btn" onClick={() => signOut()}>Sign out</button>

        <h2 style={{ marginTop: 24 }}>My Prompts</h2>
        {myPrompts === null ? (
          <div className="loading">Loading your prompts…</div>
        ) : myPrompts.length === 0 ? (
          <p className="muted">You haven’t submitted any prompts yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myPrompts.map((p, idx) => (
              <div key={p.id} className="card">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong className="muted" style={{ fontSize: 12 }}>Prompt ID: <span className="mono">{p.id.slice(0, 8)}…</span></strong>
                  <span className="muted" style={{ fontSize: 12 }}>{p.created_at ? new Date(p.created_at).toLocaleString() : ''}</span>
                </div>
                {p._error && <p className="error">{p._error}</p>}
                <label className="field">
                  <span>Title</span>
                  <input value={p.title} onChange={e => updateField(idx, 'title', e.target.value)} />
                </label>
                <label className="field">
                  <span>Type</span>
                  <div className="select">
                    <select value={p.type as PromptType} onChange={e => updateField(idx, 'type', e.target.value as PromptType)}>
                      {PROMPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </label>
                <label className="field">
                  <span>Prompt</span>
                  <textarea value={p.body} rows={5} onChange={e => updateField(idx, 'body', e.target.value)} />
                </label>
                <label className="field">
                  <span>Tags</span>
                  <TagInput value={(p.tags ?? []) as string[]} onChange={tags => updateField(idx, 'tags', tags)} />
                </label>
                <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                  <div>
                    {p._saved && <span className="muted">Saved ✓</span>}
                    {p._dirty && !p._saved && <span className="muted">Unsaved changes</span>}
                  </div>
                  <button className="btn primary" disabled={!p._dirty || p._saving || !p.title.trim() || !p.body.trim()} onClick={() => savePrompt(idx)}>
                    {p._saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container narrow">
      <h1>{mode === 'signin' ? 'Sign In' : 'Create Account'}</h1>
      {error && <p className="error">{error}</p>}
      <form className="card form" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
        </label>
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
