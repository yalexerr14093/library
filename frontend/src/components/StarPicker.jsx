import { useState } from 'react'
import styles from './StarPicker.module.css'

const LABELS = ['', 'Ужасно', 'Плохо', 'Нормально', 'Хорошо', 'Отлично']

export default function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0)
  const active = hover || value

  return (
    <div className={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          className={styles.star}
          style={{ filter: n <= active ? 'none' : 'grayscale(1) opacity(.3)' }}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
        >★</button>
      ))}
      {active > 0 && <span className={styles.label}>{LABELS[active]}</span>}
    </div>
  )
}
