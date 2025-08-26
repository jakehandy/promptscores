import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase, PROMPT_TYPES, type PromptType } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { useAuth } from '../lib/useAuth'
import TagInput from './TagInput'

export default function SubmitPromptDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<PromptType>('Learning')
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setTitle(''); setBody(''); setTags([]); setType('Learning'); setError(null)
    }
  }, [open])

  const disabled = useMemo(() => !title.trim() || !body.trim() || !user || loading, [title, body, user, loading])

  async function submit() {
    if (!user) { setError('Please sign in first.'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.from('prompts').insert<Database['public']['Tables']['prompts']['Insert']>({
      title: title.trim(),
      body: body.trim(),
      type,
      tags,
      user_id: user.id,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    onClose()
  }

  // Prevent background scroll while the dialog is open
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3>Submit Prompt</h3>
        {!user && <p className="muted">You must be signed in to submit.</p>}
        {error && <p className="error">{error}</p>}
        <label className="field">
          <span>Title</span>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Short name for your prompt" />
        </label>
        <label className="field">
          <span>Type</span>
          <div className="select">
            <select value={type} onChange={e => setType(e.target.value as PromptType)}>
              {PROMPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </label>
        <label className="field">
          <span>Prompt</span>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Paste the prompt text here" rows={6} />
        </label>
        <label className="field">
          <span>Tags</span>
          <TagInput value={tags} onChange={setTags} placeholder="e.g. gpt-4, coding, system" />
        </label>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={disabled} onClick={submit}>{loading ? 'Submitting…' : 'Submit'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
