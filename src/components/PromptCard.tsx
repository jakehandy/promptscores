import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { useAuth } from '../lib/useAuth'

export type PromptRow = {
  id: string
  title: string
  body: string
  type: string
  tags: string[] | null
  user_id: string
  created_at?: string
  vote_count?: number
}

export default function PromptCard({ prompt, initiallyVoted, onVoteChange }: {
  prompt: PromptRow
  initiallyVoted?: boolean
  onVoteChange?: (delta: number, voted: boolean) => void
}) {
  const { user } = useAuth()
  const [voted, setVoted] = useState(!!initiallyVoted)
  const [count, setCount] = useState(prompt.vote_count ?? 0)
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)

  const tags = useMemo(() => (prompt.tags ?? []), [prompt.tags])

  async function toggleVote() {
    if (!user) return // handled by parent navigation/sign-in flow
    if (pending) return
    setPending(true)
    try {
      if (voted) {
        const { error } = await supabase
          .from('prompt_votes')
          .delete()
          .eq('prompt_id', prompt.id)
          .eq('user_id', user.id)
        if (error) throw error
        setVoted(false)
        setCount(c => c - 1)
        onVoteChange?.(-1, false)
      } else {
        const { error } = await supabase
          .from('prompt_votes')
          .insert<Database['public']['Tables']['prompt_votes']['Insert']>({ prompt_id: prompt.id, user_id: user.id })
        if (error) throw error
        setVoted(true)
        setCount(c => c + 1)
        onVoteChange?.(1, true)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    } finally {
      setPending(false)
    }
  }

  async function copyPrompt() {
    try {
      const text = prompt.body
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Copy failed', e)
    }
  }

  return (
    <article className="card has-copy">
      <div className="card-top">
        <div className="type">{prompt.type === 'Chat Setup' ? 'Learning' : prompt.type}</div>
        <button className={`vote ${voted ? 'active' : ''}`} onClick={toggleVote} disabled={pending || !user} aria-label="Toggle vote">
          <span className="thumb">👍</span>
          <span>{count}</span>
        </button>
      </div>
      <h3 className="title">{prompt.title}</h3>
      <pre className="body" title={prompt.body}>{prompt.body}</pre>
      {/* Tags intentionally hidden from display; still used for search */}
      <button className="copy-btn" onClick={copyPrompt} aria-live="polite" aria-label={copied ? 'Copied' : 'Copy prompt'} title={copied ? 'Copied!' : 'Copy full prompt'}>
        {copied ? (
          // check icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          // copy icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
            <rect x="5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" opacity="0.7"/>
          </svg>
        )}
      </button>
    </article>
  )
}
