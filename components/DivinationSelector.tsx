'use client'

import { DIVINATION_IDS, DIVINATION_META, DEFAULT_ON, type DivinationId } from '../lib/divination-config'

interface DivinationSelectorProps {
  selected: DivinationId[]
  onChange: (next: DivinationId[]) => void
}

export function DivinationSelector({ selected, onChange }: DivinationSelectorProps) {
  const allSelected = DIVINATION_IDS.every(id => selected.includes(id))

  const toggle = (id: DivinationId) => {
    if (selected.includes(id)) {
      // 最低1つは必須
      if (selected.length <= 1) return
      onChange(selected.filter(s => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const toggleAll = () => {
    if (allSelected) {
      // 全選択 → デフォルト6に戻す（最低1つ保証）
      onChange([...DEFAULT_ON])
    } else {
      onChange([...DIVINATION_IDS])
    }
  }

  return (
    <div className="divination-selector">
      <div className="divination-selector-header">
        <span className="divination-selector-title">占術を選ぶ</span>
        <button
          type="button"
          className="divination-selector-toggle-all"
          onClick={toggleAll}
        >
          {allSelected ? 'デフォルトに戻す' : 'すべて選択'}
        </button>
      </div>
      <div className="divination-selector-list">
        {DIVINATION_IDS.map(id => {
          const meta = DIVINATION_META[id]
          const checked = selected.includes(id)
          const isDefault = DEFAULT_ON.includes(id)
          return (
            <label
              key={id}
              className={`divination-selector-item ${checked ? 'divination-selector-item-on' : ''}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(id)}
                className="divination-selector-checkbox"
              />
              <span className="divination-selector-item-name">
                {meta.name}
                {isDefault && <span className="divination-selector-default-badge">デフォルト</span>}
              </span>
              <span className="divination-selector-item-desc">{meta.description}</span>
              <div className="divination-tag-list">
                {meta.tags.map(tag => (
                  <span key={tag} className="divination-tag">{tag}</span>
                ))}
              </div>
            </label>
          )
        })}
      </div>
      {selected.length === 0 && (
        <p className="divination-selector-error">最低1つの占術を選択してください。</p>
      )}
    </div>
  )
}
