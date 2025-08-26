import { Outlet, useLocation } from 'react-router-dom'
import NavBar from './components/NavBar'
import ThemeToggle from './components/ThemeToggle'

export default function App() {
  const location = useLocation()
  return (
    <div className="app">
      <NavBar />
      <main className="container" data-route={location.pathname}>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <span>© {new Date().getFullYear()} <a href="https://jakehandy.com" target="_blank" rel="noreferrer">Jake Handy</a></span>
          <span className="footer-actions">
            <ThemeToggle />
          </span>
        </div>
      </footer>
    </div>
  )
}
