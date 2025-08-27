import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import SubmitPromptDialog from './SubmitPromptDialog'
import { ThumbsUp } from 'lucide-react'

export default function NavBar() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuClosing, setMenuClosing] = useState(false)
  const MENU_ANIM_MS = 220
  const navigate = useNavigate()

  function closeMenu() {
    if (!menuOpen) return
    setMenuOpen(false)
    setMenuClosing(true)
    window.setTimeout(() => setMenuClosing(false), MENU_ANIM_MS)
  }

  // Lock background scroll and close on Escape while menu is shown or closing
  useEffect(() => {
    const showing = menuOpen || menuClosing
    if (!showing) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen, menuClosing])

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
            <>
              <Link className="btn ghost" to={`/profile/${user.id}`}>My Profile</Link>
              <Link className="btn ghost" to="/account">Account</Link>
            </>
          ) : (
            <button className="btn ghost" onClick={() => navigate('/account')}>Sign In</button>
          )}
        </div>
        <button
          className="menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>
      {(menuOpen || menuClosing) && createPortal(
        <div className={`mobile-menu-backdrop ${menuClosing ? 'closing' : ''}`} onClick={() => closeMenu()}>
          <div className={`mobile-menu ${menuClosing ? 'closing' : ''}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="menu-header">
              <strong>Menu</strong>
              <button className="mobile-close" aria-label="Close menu" onClick={() => closeMenu()}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="menu-list">
              <button
                className="btn primary"
                onClick={() => { closeMenu(); window.setTimeout(() => setOpen(true), MENU_ANIM_MS) }}
              >
                Submit Prompt
              </button>
              <Link
                className="btn ghost"
                to={user ? `/profile/${user.id}` : '/account'}
                onClick={() => closeMenu()}
              >
                My Profile
              </Link>
              <Link className="btn ghost" to="/account" onClick={() => closeMenu()}>
                Account
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}
      <SubmitPromptDialog open={open} onClose={() => setOpen(false)} />
    </header>
  )
}
