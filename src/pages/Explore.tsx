import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { supabase, PROMPT_TYPES, type PromptType } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { useAuth } from '../lib/useAuth'
import SearchBar from '../components/SearchBar'
import FilterChips from '../components/FilterChips'
import PromptCard, { type PromptRow } from '../components/PromptCard'
import { useNavigate } from 'react-router-dom'

type PromptWithVoted = PromptRow & { voted?: boolean }

export default function Explore() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [prompts, setPrompts] = useState<PromptWithVoted[]>([])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<PromptType | 'All'>('All')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      // Get prompts with counts from view; fallback to base table
      const { data: rows, error } = await supabase
        .from('prompts_with_counts')
        .select('*')
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('Falling back to prompts due to missing view', error.message)
      }
      let base: PromptWithVoted[] = (rows ?? []) as any
      if (!base?.length) {
        const { data: rows2 } = await supabase
          .from('prompts')
          .select('*')
        const typedRows2 = (rows2 ?? []) as Database['public']['Tables']['prompts']['Row'][]
        base = typedRows2.map(r => ({ ...r, vote_count: 0 })) as any
      }
      // Mark votes by current user
      if (user) {
        const { data: votes } = await supabase
          .from('prompt_votes')
          .select('prompt_id')
          .eq('user_id', user.id)
        const typedVotes = (votes ?? []) as Pick<Database['public']['Tables']['prompt_votes']['Row'], 'prompt_id'>[]
        const set = new Set(typedVotes.map(v => v.prompt_id))
        base = base.map(p => ({ ...p, voted: set.has(p.id) }))
      }
      // Normalize legacy types for UI display/filters
      base = base.map(p => ({
        ...p,
        type: p.type === 'System Prompt' ? 'Global Instruction' : (p.type === 'Chat Setup' ? 'Learning' : p.type),
      }))
      if (mounted) setPrompts(base)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [user])

  // Smoothly fade skeletons out and cards in
  useEffect(() => {
    if (!loading) {
      setTransitioning(true)
      const id = setTimeout(() => setTransitioning(false), 220)
      return () => clearTimeout(id)
    }
  }, [loading])

  const fuse = useMemo(() => new Fuse(prompts, {
    includeScore: true,
    threshold: 0.35,
    keys: [
      { name: 'title', weight: 0.5 },
      { name: 'body', weight: 0.3 },
      { name: 'type', weight: 0.2 },
      { name: 'tags', weight: 0.2 },
    ],
  }), [prompts])

  const filtered = useMemo(() => {
    let list = prompts
    if (typeFilter !== 'All') {
      if (typeFilter === 'Learning') {
        list = list.filter(p => p.type === 'Learning' || p.type === 'Chat Setup')
      } else {
        list = list.filter(p => p.type === typeFilter)
      }
    }
    if (query.trim()) {
      list = fuse.search(query.trim()).map(r => r.item)
    }
    return [...list].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
  }, [prompts, fuse, query, typeFilter])

  return (
    <section className="explore">
      <div className="hero">
        <h1>Explore</h1>
        <p className="muted">Discover, vote, and share high-quality prompts.</p>
        <SearchBar query={query} setQuery={setQuery} onClear={() => setQuery('')} />
        <div className="filters">
          <FilterChips value={typeFilter} onChange={setTypeFilter} />
        </div>
      </div>
      <div className={`fade-grid ${!loading && !transitioning ? 'ready' : ''}`}>
        {(loading || transitioning) && (
          <div className="grid" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <article key={i} className="card">
                <div className="card-top">
                  <div className="skeleton skeleton-badge" style={{ width: 90, height: 22, borderRadius: 999 }} />
                  <div className="skeleton skeleton-chip" style={{ width: 54, height: 26, borderRadius: 999 }} />
                </div>
                <div className="skeleton skeleton-title" style={{ width: '70%', height: 20, borderRadius: 8 }} />
                <div className="skeleton skeleton-body" style={{ width: '100%', height: 120, borderRadius: 10 }} />
              </article>
            ))}
          </div>
        )}
        <div className="grid real">
          {filtered.map(p => (
            <PromptCard
              key={p.id}
              prompt={p}
              initiallyVoted={p.voted}
              onVoteChange={(delta, voted) => {
                p.vote_count = (p.vote_count ?? 0) + delta
                p.voted = voted
              }}
            />
          ))}
          {!filtered.length && !loading && !transitioning && (
            <div className="empty">
              <p>No prompts match your search.</p>
              {!user && (
                <button className="btn ghost" onClick={() => navigate('/account')}>Sign in to contribute</button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
