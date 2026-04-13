import { useState } from 'react'
import './App.css'
import { supabase } from './supabase'
import logo from './assets/Nelliys Logo.png'

const questions = [
  { key: 'overall',     label: 'How would you rate your overall experience?',    options: ['Excellent', 'Good', 'Average', 'Poor'] },
  { key: 'coffee',      label: 'How was the quality of your coffee or food?',    options: ['Excellent', 'Good', 'Average', 'Poor'] },
  { key: 'service',     label: 'How was the service?',                           options: ['Friendly', 'Okay', 'Needs Improvement'] },
  { key: 'wait',        label: 'How long did you wait for your order?',          options: ['Fast', 'Acceptable', 'Too Long'] },
  { key: 'cleanliness', label: 'How clean and comfortable was the café?',        options: ['Very Clean', 'Clean', 'Needs Improvement'] },
  { key: 'price',       label: 'Do you think the price matches the quality?',    options: ['Yes', 'Fair', 'No'] },
  { key: 'recommend',   label: 'Would you recommend us to others?',              options: ['Yes', 'Maybe', 'No'] },
]

const sentimentColor = {
  Excellent: '#22c55e', Good: '#84cc16', Average: '#f59e0b', Poor: '#ef4444',
  Friendly: '#22c55e', Okay: '#f59e0b', 'Needs Improvement': '#ef4444',
  Fast: '#22c55e', Acceptable: '#f59e0b', 'Too Long': '#ef4444',
  'Very Clean': '#22c55e', Clean: '#84cc16',
  Yes: '#22c55e', Fair: '#f59e0b', No: '#ef4444', Maybe: '#f59e0b',
}

const initialForm = Object.fromEntries(questions.map(q => [q.key, '']))

export default function App() {
  const [form, setForm] = useState({ ...initialForm, liked: '', improve: '', name: '', table_number: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const answered = questions.filter(q => form[q.key] !== '').length
  const allAnswered = answered === questions.length
  const progress = Math.round((answered / questions.length) * 100)

  const handleSubmit = async e => {
    e.preventDefault()
    if (!allAnswered) return
    setLoading(true)
    setError('')
    const { error } = await supabase.from('feedback').insert([form])
    setLoading(false)
    if (error) { setError('Failed to submit. Please try again.'); return }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="app">
        <div className="card success-card">
          <img src={logo} alt="Nelliy's Coffee" className="logo-img" />
          <div className="success-icon">🎉</div>
          <h2>Thank You{form.name ? `, ${form.name}` : ''}!</h2>
          <p>Your feedback helps us brew a better experience.</p>
          <div className="summary-grid">
            {questions.map(q => (
              <div key={q.key} className="summary-row">
                <span className="summary-q">{q.label}</span>
                <span className="summary-a" style={{ color: sentimentColor[form[q.key]] }}>{form[q.key]}</span>
              </div>
            ))}
            {form.liked && <div className="summary-row"><span className="summary-q">What you liked</span><span className="summary-a neutral">{form.liked}</span></div>}
            {form.improve && <div className="summary-row"><span className="summary-q">Improvement suggestion</span><span className="summary-a neutral">{form.improve}</span></div>}
          </div>
          <button className="btn" onClick={() => { setForm({ ...initialForm, liked: '', improve: '', name: '', table_number: '' }); setSubmitted(false) }}>
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="card">
        <div className="header">
          <img src={logo} alt="Nelliy's Coffee" className="logo-img" />
          <p className="tagline">Addis Ababa · Customer Survey</p>
        </div>

        {/* Progress bar */}
        <div className="progress-wrap">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-label">{answered}/{questions.length} answered</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="questions-list">

            {/* Name + Table row */}
            <div className="q-block fade-in info-row">
              <div className="info-field">
                <p className="q-label">Your Name <span className="optional">(Optional)</span></p>
                <input type="text" placeholder="e.g. Sara" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="info-field">
                <p className="q-label">Table Number <span className="optional">(Optional)</span></p>
                <input type="text" placeholder="e.g. 4" value={form.table_number} onChange={e => set('table_number', e.target.value)} />
              </div>
            </div>

            {questions.map((q, i) => (
              <div key={q.key} className="q-block fade-in">
                <p className="q-label"><span className="q-num">{i + 1}</span>{q.label}</p>
                <div className="chip-group">
                  {q.options.map(opt => (
                    <button
                      key={opt} type="button"
                      className={`chip ${form[q.key] === opt ? 'selected' : ''}`}
                      style={form[q.key] === opt ? { background: sentimentColor[opt], borderColor: sentimentColor[opt] } : {}}
                      onClick={() => set(q.key, opt)}
                    >{opt}</button>
                  ))}
                </div>
              </div>
            ))}

            <div className="q-block fade-in">
              <p className="q-label"><span className="q-num">8</span>What did you like most? <span className="optional">(Optional)</span></p>
              <textarea rows={3} placeholder="Tell us what you loved..." value={form.liked} onChange={e => set('liked', e.target.value)} />
            </div>

            <div className="q-block fade-in">
              <p className="q-label"><span className="q-num">9</span>What can we improve? <span className="optional">(Optional)</span></p>
              <textarea rows={3} placeholder="Your suggestions help us grow..." value={form.improve} onChange={e => set('improve', e.target.value)} />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={!allAnswered || loading} className={`btn btn-submit ${!allAnswered ? 'disabled' : ''}`}>
            {loading ? 'Submitting...' : allAnswered ? 'Submit Feedback ✓' : `${questions.length - answered} question${questions.length - answered !== 1 ? 's' : ''} remaining`}
          </button>
        </form>
      </div>
    </div>
  )
}
