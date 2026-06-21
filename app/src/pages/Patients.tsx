// 환자 목록 · 검색 · 등록 (FR-01)
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPatient, listPatients } from '@/lib/repo'
import type { Patient, Sex } from '@/lib/types'
import { age } from '@/lib/format'

export function Patients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const reload = async () => {
    setLoading(true)
    setPatients(await listPatients())
    setLoading(false)
  }
  useEffect(() => {
    void reload()
  }, [])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return patients
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(t) ||
        p.chartNo.toLowerCase().includes(t) ||
        (p.phone ?? '').includes(t),
    )
  }, [patients, q])

  return (
    <div>
      <div className="panel">
        <div className="row">
          <h2 style={{ margin: 0 }}>환자 관리</h2>
          <span className="spacer" />
          <input
            placeholder="이름 · 등록번호 · 연락처 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <button className="primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? '닫기' : '+ 환자 등록'}
          </button>
        </div>
      </div>

      {showForm && (
        <NewPatientForm
          onCreated={async () => {
            setShowForm(false)
            await reload()
          }}
        />
      )}

      <div className="panel">
        {loading ? (
          <p className="muted">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <p className="muted">등록된 환자가 없습니다.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>등록번호</th>
                <th>성명</th>
                <th>성별</th>
                <th>생년월일(나이)</th>
                <th>연락처</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/patients/${p.id}`)}
                >
                  <td>{p.chartNo}</td>
                  <td>{p.name}</td>
                  <td>{p.sex === 'female' ? '여' : '남'}</td>
                  <td>
                    {p.birthDate} {p.birthDate && `(${age(p.birthDate)})`}
                  </td>
                  <td>{p.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function NewPatientForm({ onCreated }: { onCreated: () => void }) {
  const [chartNo, setChartNo] = useState('')
  const [name, setName] = useState('')
  const [sex, setSex] = useState<Sex>('female')
  const [birthDate, setBirthDate] = useState('')
  const [rrn, setRrn] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [job, setJob] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!name.trim() || !chartNo.trim()) return setErr('성명과 등록번호는 필수입니다.')
    setBusy(true)
    try {
      await createPatient({
        chartNo: chartNo.trim(),
        name: name.trim(),
        sex,
        birthDate,
        rrn: rrn.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        job: job.trim() || undefined,
        firstVisitDate: undefined,
      })
      onCreated()
    } catch (e2) {
      setErr((e2 as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h3>새 환자 등록</h3>
      <div className="form-grid">
        <div className="field third">
          <span className="field-label">등록번호*</span>
          <input value={chartNo} onChange={(e) => setChartNo(e.target.value)} required />
        </div>
        <div className="field third">
          <span className="field-label">성명*</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field third">
          <span className="field-label">성별</span>
          <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="female">여</option>
            <option value="male">남</option>
          </select>
        </div>
        <div className="field third">
          <span className="field-label">생년월일</span>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </div>
        <div className="field third">
          <span className="field-label">주민등록번호 (선택, 암호화)</span>
          <input value={rrn} onChange={(e) => setRrn(e.target.value)} placeholder="고유식별정보" />
        </div>
        <div className="field third">
          <span className="field-label">연락처</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field half">
          <span className="field-label">주소</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="field half">
          <span className="field-label">직업</span>
          <input value={job} onChange={(e) => setJob(e.target.value)} />
        </div>
      </div>
      {err && <p className="error-text">{err}</p>}
      <div className="row" style={{ marginTop: 12 }}>
        <span className="spacer" />
        <button className="primary" type="submit" disabled={busy}>
          {busy ? '저장 중…' : '등록'}
        </button>
      </div>
    </form>
  )
}
