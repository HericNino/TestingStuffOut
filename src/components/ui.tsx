import { useEffect, useRef, type ReactNode } from 'react'

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      className={`modal${wide ? ' modal-wide' : ''}`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="modal-body">
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}

/** `group` renders a <div> instead of a <label>, for controls made of several buttons. */
export function Field({ label, children, hint, group }: { label: string; children: ReactNode; hint?: string; group?: boolean }) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </Tag>
  )
}

export function Figure({ label, value, unit, detail, highlight }: { label: string; value: ReactNode; unit?: string; detail?: ReactNode; highlight?: boolean }) {
  return (
    <div className={`figure${highlight ? ' highlight' : ''}`}>
      <div className="figure-value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      <div className="figure-label">{label}</div>
      {detail && <div className="figure-detail">{detail}</div>}
    </div>
  )
}

export function Section({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`section${className ? ` ${className}` : ''}`}>
      <header className="section-head">
        <h2>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  )
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <div>{children}</div>}
    </div>
  )
}

export function Dots({ value, max = 5, onChange, label }: { value: number; max?: number; onChange?: (v: number) => void; label: string }) {
  return (
    <span className="dots" aria-label={`${label}: ${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`dot${i < value ? ' on' : ''}`}
          disabled={!onChange}
          onClick={() => onChange?.(i + 1 === value ? i : i + 1)}
          aria-label={`${label} ${i + 1}`}
        />
      ))}
    </span>
  )
}
