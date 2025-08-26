import { PROMPT_TYPES, type PromptType } from '../lib/supabase'

export default function FilterChips({ value, onChange }: { value: PromptType | 'All'; onChange: (v: PromptType | 'All') => void }) {
  const items: (PromptType | 'All')[] = ['All', ...PROMPT_TYPES]
  return (
    <div className="chips">
      {items.map((item) => (
        <button
          key={item}
          className={`chip ${value === item ? 'active' : ''}`}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

