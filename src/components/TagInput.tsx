import { useMemo, useRef, useState } from 'react'

export default function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function add(tag: string) {
    const t = tag.trim().toLowerCase()
    if (!t) return
    if (value.includes(t)) return
    onChange([...value, t])
    setInput('')
  }

  function remove(tag: string) {
    onChange(value.filter(v => v !== tag))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(input)
    } else if (e.key === 'Backspace' && !input && value.length) {
      remove(value[value.length - 1])
    }
  }

  const display = useMemo(() => value, [value])

  return (
    <div className="tag-input" onClick={() => inputRef.current?.focus()}>
      {display.map(tag => (
        <span key={tag} className="chip">
          {tag}
          <button className="x" onClick={() => remove(tag)} aria-label={`Remove ${tag}`}>×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
      />
    </div>
  )
}

