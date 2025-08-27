import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { useAuth } from '../lib/useAuth'
import PromptCard, { type PromptRow } from '../components/PromptCard'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProfileMetricsRow = Database['public']['Views']['profile_metrics']['Row']

type PromptWithVoted = PromptRow & { voted?: boolean }

export default function Profile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [prompts, setPrompts] = useState<PromptWithVoted[]>([])
  const [votesGiven, setVotesGiven] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<ProfileMetricsRow | null>(null)

  const profileId = id as string | undefined

  useEffect(() => {
    let active = true
    async function loadAll() {
      if (!profileId) { setError('Profile not found'); setLoading(false); return }
      setLoading(true); setError(null)

      // Load profile basics
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle()
      if (!active) return
      setProfile(prof ?? { id: profileId, created_at: null, display_name: null, display_name_last_changed_at: null })

      // Load percentile metrics (view). If not present, silently ignore.
      try {
        const { data: m } = await supabase
          .from('profile_metrics')
          .select('*')
          .eq('user_id', profileId)
          .maybeSingle()
        if (!active) return
        setMetrics(m ?? null)
      } catch {
        // ignore
      }

      // Load this user's prompts with vote counts
      const { data: rows, error: promptsErr } = await supabase
        .from('prompts_with_counts')
        .select('*')
        .eq('user_id', profileId)
      if (promptsErr) {
        // eslint-disable-next-line no-console
        console.error(promptsErr)
      }
      const list = ((rows ?? []) as any as PromptRow[]).map(r => ({
        ...r,
      })) as PromptWithVoted[]

      // Mark votes by current user (viewer)
      if (user) {
        const { data: votes } = await supabase
          .from('prompt_votes')
          .select('prompt_id')
          .eq('user_id', user.id)
        const set = new Set((votes ?? []).map(v => (v as any).prompt_id as string))
        for (const p of list) p.voted = set.has(p.id)
      }
      if (!active) return
      setPrompts(list)

      // Votes given by this profile
      const { count: votesGivenCount } = await supabase
        .from('prompt_votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileId)
      if (!active) return
      setVotesGiven(votesGivenCount ?? 0)

      setLoading(false)
    }
    loadAll()
    return () => { active = false }
  }, [profileId, user?.id])

  const votesReceived = useMemo(() => {
    return prompts.reduce((sum, p) => sum + (p.vote_count ?? 0), 0)
  }, [prompts])

  function ordinal(n: number | undefined): string {
    if (!n || n <= 0) return '0th percentile'
    const v = Math.max(1, Math.min(100, Math.round(n)))
    const j = v % 10, k = v % 100
    const suffix = (j === 1 && k !== 11) ? 'st' : (j === 2 && k !== 12) ? 'nd' : (j === 3 && k !== 13) ? 'rd' : 'th'
    return `${v}${suffix} percentile`
  }

  if (!profileId) {
    return (
      <div className="container narrow">
        <div className="empty">Profile not found.</div>
      </div>
    )
  }

  return (
    <section className="profile">
      <div className="profile-header">
        <button className="btn ghost" onClick={() => navigate(-1)} aria-label="Back" style={{ marginRight: 8 }}>←</button>
        <div>
          <h1 className="profile-name">{profile?.display_name || 'User'}</h1>
          <p className="muted" style={{ marginTop: -6, fontSize: 14 }}>ID: <span className="mono">{profileId.slice(0, 8)}…</span></p>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat">
          <div className="stat-label">Profile Age</div>
          <div className="stat-value">
            {profile?.created_at ? `${Math.max(0, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)))}d` : '—'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Prompts Created</div>
          <div className="stat-value">{metrics?.prompts_created ?? prompts.length}</div>
          {metrics && <div className="kpi">{ordinal(metrics.prompts_percentile)}</div>}
        </div>
        <div className="stat">
          <div className="stat-label">Votes Received</div>
          <div className="stat-value">{metrics?.votes_received ?? votesReceived}</div>
          {metrics && <div className="kpi">{ordinal(metrics.votes_received_percentile)}</div>}
        </div>
        <div className="stat">
          <div className="stat-label">Votes Given</div>
          <div className="stat-value">{metrics?.votes_given ?? votesGiven}</div>
          {metrics && <div className="kpi">{ordinal(metrics.votes_given_percentile)}</div>}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className={`fade-grid ${!loading ? 'ready' : ''}`}>
        {loading && (
          <div className="grid" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
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
          {prompts.map(p => (
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
          {!prompts.length && !loading && (
            <div className="empty">
              <p>No prompts yet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}


