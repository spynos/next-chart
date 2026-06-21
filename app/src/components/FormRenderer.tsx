// 스키마 기반 입력 렌더러 — 차트 편집 화면에서 사용.
import type { Field, FormSchema } from '@/forms/schema'

type Data = Record<string, unknown>

interface Props {
  schema: FormSchema
  data: Data
  onChange: (id: string, value: unknown) => void
}

const OTHER = '__기타__'

function widthClass(f: Field): string {
  return `field ${f.width ?? 'full'}`
}

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : []
}

export function FormRenderer({ schema, data, onChange }: Props) {
  return (
    <div>
      {schema.sections.map((section) => (
        <section key={section.id}>
          <h3>{section.title}</h3>
          <div className="form-grid">
            {section.fields.map((f) => (
              <FieldInput key={f.id} field={f} value={data[f.id]} onChange={onChange} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function FieldInput({
  field: f,
  value,
  onChange,
}: {
  field: Field
  value: unknown
  onChange: (id: string, value: unknown) => void
}) {
  if (f.kind === 'heading') {
    return <div className="field-heading">{f.label}</div>
  }

  const label = (
    <span className="field-label">
      {f.label}
      {f.required && <span className="required-star">*</span>}
      {f.unit && <span className="unit">({f.unit})</span>}
    </span>
  )

  return (
    <div className={widthClass(f)}>
      {label}
      <FieldControl field={f} value={value} onChange={onChange} />
      {f.note && <span className="field-note">{f.note}</span>}
    </div>
  )
}

function FieldControl({
  field: f,
  value,
  onChange,
}: {
  field: Field
  value: unknown
  onChange: (id: string, value: unknown) => void
}) {
  switch (f.kind) {
    case 'text':
      return (
        <input
          type="text"
          value={(value as string) ?? ''}
          placeholder={f.placeholder}
          onChange={(e) => onChange(f.id, e.target.value)}
        />
      )
    case 'number':
      return (
        <input
          type="number"
          value={value === undefined || value === null ? '' : (value as number)}
          placeholder={f.placeholder}
          onChange={(e) =>
            onChange(f.id, e.target.value === '' ? undefined : Number(e.target.value))
          }
        />
      )
    case 'date':
      return (
        <input
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(f.id, e.target.value)}
        />
      )
    case 'textarea':
      return (
        <textarea
          value={(value as string) ?? ''}
          placeholder={f.placeholder}
          onChange={(e) => onChange(f.id, e.target.value)}
        />
      )
    case 'radio':
    case 'scale':
      return <RadioGroup field={f} value={value} onChange={onChange} />
    case 'checks':
      return <CheckGroup field={f} value={value} onChange={onChange} />
    default:
      return null
  }
}

// 단일 선택(+기타 자유입력)
function RadioGroup({
  field: f,
  value,
  onChange,
}: {
  field: Field
  value: unknown
  onChange: (id: string, value: unknown) => void
}) {
  const options = f.options ?? []
  const current = (value as string) ?? ''
  const isOther = current !== '' && !options.includes(current)
  return (
    <div className="option-group">
      {options.map((opt) => (
        <label key={opt}>
          <input
            type="radio"
            name={f.id}
            checked={current === opt}
            onChange={() => onChange(f.id, opt)}
          />
          {opt}
        </label>
      ))}
      {f.allowOther && (
        <span className="inline-other">
          <label>
            <input
              type="radio"
              name={f.id}
              checked={isOther}
              onChange={() => onChange(f.id, OTHER)}
            />
            기타
          </label>
          {(isOther || current === OTHER) && (
            <input
              type="text"
              value={current === OTHER ? '' : current}
              placeholder="직접 입력"
              onChange={(e) => onChange(f.id, e.target.value)}
            />
          )}
        </span>
      )}
      {current !== '' && (
        <button
          type="button"
          className="no-print"
          style={{ padding: '2px 8px', fontSize: 12 }}
          onClick={() => onChange(f.id, '')}
        >
          지우기
        </button>
      )}
    </div>
  )
}

// 다중 선택(+기타 자유입력). 값은 string[].
function CheckGroup({
  field: f,
  value,
  onChange,
}: {
  field: Field
  value: unknown
  onChange: (id: string, value: unknown) => void
}) {
  const options = f.options ?? []
  const selected = asArray(value)
  const otherValue = selected.find((s) => !options.includes(s)) ?? ''
  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt]
    onChange(f.id, next)
  }
  const setOther = (text: string) => {
    const base = selected.filter((s) => options.includes(s))
    onChange(f.id, text ? [...base, text] : base)
  }
  return (
    <div className="option-group">
      {options.map((opt) => (
        <label key={opt}>
          <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
          {opt}
        </label>
      ))}
      {f.allowOther && (
        <span className="inline-other">
          기타:
          <input
            type="text"
            value={otherValue}
            placeholder="직접 입력"
            onChange={(e) => setOther(e.target.value)}
          />
        </span>
      )}
    </div>
  )
}
