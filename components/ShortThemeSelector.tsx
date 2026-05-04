'use client'

export const SHORT_THEMES = [
  { id: 'love',    label: '恋愛・パートナーシップ', icon: '♡' },
  { id: 'career',  label: '仕事・キャリア',         icon: '✦' },
  { id: 'money',   label: 'お金・豊かさ',           icon: '★' },
  { id: 'health',  label: '健康・身体',             icon: '❤' },
  { id: 'family',  label: '家族・人間関係',         icon: '☆' },
  { id: 'overall', label: '総合・人生全般',         icon: '✨' },
] as const

export type ShortThemeId = typeof SHORT_THEMES[number]['id']

interface ShortThemeSelectorProps {
  selected: ShortThemeId
  onChange: (id: ShortThemeId) => void
}

export function ShortThemeSelector({ selected, onChange }: ShortThemeSelectorProps) {
  return (
    <div className="short-theme-selector">
      <p className="short-theme-selector-label">テーマを選ぶ</p>
      <div className="short-theme-grid">
        {SHORT_THEMES.map(theme => (
          <label
            key={theme.id}
            className={`short-theme-option ${selected === theme.id ? 'short-theme-option-selected' : ''}`}
          >
            <input
              type="radio"
              name="short-theme"
              value={theme.id}
              checked={selected === theme.id}
              onChange={() => onChange(theme.id)}
              className="short-theme-radio"
            />
            <span className="short-theme-icon">{theme.icon}</span>
            <span className="short-theme-text">{theme.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
