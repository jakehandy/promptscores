import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import SubmitPromptDialog from './SubmitPromptDialog'
import { ThumbsUp } from 'lucide-react'

export default function NavBar() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="logo" aria-label="Prompt Scores home">
          <span className="logo-icon" aria-hidden>
            <ThumbsUp size={22} strokeWidth={2.2} />
          </span>
          <span>Prompt Scores</span>
        </Link>
        <div className="nav-actions">
          <button className="btn primary" onClick={() => setOpen(true)}>
            Submit Prompt
          </button>
          {user ? (
            <Link className="btn ghost" to="/account">Account</Link>
          ) : (
            <button className="btn ghost" onClick={() => navigate('/account')}>Sign In</button>
          )}
        </div>
      </div>
      <SubmitPromptDialog open={open} onClose={() => setOpen(false)} />
    </header>
  )
}
