import { useState } from 'react'
import './App.css'
import { supabase } from './supabase'
import logo from './assets/Nelliys Logo.png'

const T = {
  en: {
    tagline: 'Addis Ababa · Customer Survey',
    nameLabel: 'Your Name', tablLabel: 'Table Number', optional: '(Optional)',
    namePlaceholder: 'e.g. Sara', tablePlaceholder: 'e.g. 4',
    likedLabel: 'What did you like most?', likedPlaceholder: 'Tell us what you loved...',
    improveLabel: 'What can we improve?', improvePlaceholder: 'Your suggestions help us grow...',
    submit: 'Submit Feedback ✓', submitting: 'Submitting...',
    remaining: n => `${n} question${n !== 1 ? 's' : ''} remaining`,
    thankYou: name => `Thank You${name ? `, ${name}` : ''}!`,
    thankYouSub: 'Your feedback helps us brew a better experience.',
    submitAnother: 'Submit Another', whatLiked: 'What you liked', improvement: 'Improvement suggestion',
    answered: (a, t) => `${a}/${t} answered`,
    questions: [
      { key: 'overall',     label: 'How would you rate your overall experience?',  options: ['Excellent', 'Good', 'Average', 'Poor'] },
      { key: 'coffee',      label: 'How was the quality of your coffee or food?',  options: ['Excellent', 'Good', 'Average', 'Poor'] },
      { key: 'service',     label: 'How was the service?',                         options: ['Friendly', 'Okay', 'Needs Improvement'] },
      { key: 'wait',        label: 'How long did you wait for your order?',        options: ['Fast', 'Acceptable', 'Too Long'] },
      { key: 'cleanliness', label: 'How clean and comfortable was the café?',      options: ['Very Clean', 'Clean', 'Needs Improvement'] },
      { key: 'price',       label: 'Do you think the price matches the quality?',  options: ['Yes', 'Fair', 'No'] },
      { key: 'recommend',   label: 'Would you recommend us to others?',            options: ['Yes', 'Maybe', 'No'] },
    ],
  },
  am: {
    tagline: 'አዲስ አበባ · የደንበኛ አስተያየት',
    nameLabel: 'ስምዎ', tablLabel: 'የጠረጴዛ ቁጥር', optional: '(አማራጭ)',
    namePlaceholder: 'ለምሳሌ፡ ሳራ', tablePlaceholder: 'ለምሳሌ፡ 4',
    likedLabel: 'በጣም የወደዱት ምንድን ነው?', likedPlaceholder: 'የወደዱትን ይንገሩን...',
    improveLabel: 'ምን ማሻሻል እንዲሻሻል?', improvePlaceholder: 'አስተያየትዎ እንድናድግ ይረዳናል...',
    submit: 'አስተያየት ያስገቡ ✓', submitting: 'በማስገባት ላይ...',
    remaining: n => `${n} ጥያቄ${n !== 1 ? 'ዎች' : ''} ቀርተዋል`,
    thankYou: name => `አመሰግናለሁ${name ? `፣ ${name}` : ''}!`,
    thankYouSub: 'አስተያየትዎ የተሻለ አገልግሎት እንድንሰጥ ይረዳናል።',
    submitAnother: 'ሌላ አስተያየት ያስገቡ', whatLiked: 'የወደዱት', improvement: 'የማሻሻያ ሃሳብ',
    answered: (a, t) => `${a}/${t} ተመልሷል`,
    questions: [
      { key: 'overall',     label: 'በአጠቃላይ ተሞክሮዎ እንዴት ይገምግሙታል?',       options: ['በጣም ጥሩ', 'ጥሩ', 'መካከለኛ', 'መጥፎ'] },
      { key: 'coffee',      label: 'የቡና ወይም የምግብ ጥራት እንዴት ነበር?',         options: ['በጣም ጥሩ', 'ጥሩ', 'መካከለኛ', 'መጥፎ'] },
      { key: 'service',     label: 'አገልግሎቱ እንዴት ነበር?',                   options: ['ወዳጃዊ', 'መካከለኛ', 'ማሻሻል ያስፈልጋል'] },
      { key: 'wait',        label: 'ትዕዛዝዎን ለመቀበል ምን ያህል ጊዜ ጠበቁ?',        options: ['ፈጣን', 'ተቀባይነት ያለው', 'በጣም ረጅም'] },
      { key: 'cleanliness', label: 'ካፌው ምን ያህል ንጹህ እና ምቹ ነበር?',          options: ['በጣም ንጹህ', 'ንጹህ', 'ማሻሻል ያስፈልጋል'] },
      { key: 'price',       label: 'ዋጋው ከጥራቱ ጋር ይዛመዳል ብለው ያስባሉ?',       options: ['አዎ', 'ተቀባይነት አለው', 'አይደለም'] },
      { key: 'recommend',   label: 'ለሌሎች ይመክሩናል?',                       options: ['አዎ', 'ምናልባት', 'አይደለም'] },
    ],
  },
}

const sentimentKeyMap = {
  'በጣም ጥሩ': 'Excellent', 'ጥሩ': 'Good', 'መካከለኛ': 'Average', 'መጥፎ': 'Poor',
  'ወዳጃዊ': 'Friendly', 'ማሻሻል ያስፈልጋል': 'Needs Improvement',
  'ፈጣን': 'Fast', 'ተቀባይነት ያለው': 'Acceptable', 'በጣም ረጅም': 'Too Long',
  'በጣም ንጹህ': 'Very Clean', 'ንጹህ': 'Clean',
  'አዎ': 'Yes', 'ተቀባይነት አለው': 'Fair', 'አይደለም': 'No', 'ምናልባት': 'Maybe',
}

const sentimentColor = {
  Excellent: '#22c55e', Good: '#84cc16', Average: '#f59e0b', Poor: '#ef4444',
  Friendly: '#22c55e', Okay: '#f59e0b', 'Needs Improvement': '#ef4444',
  Fast: '#22c55e', Acceptable: '#f59e0b', 'Too Long': '#ef4444',
  'Very Clean': '#22c55e', Clean: '#84cc16',
  Yes: '#22c55e', Fair: '#f59e0b', No: '#ef4444', Maybe: '#f59e0b',
}

const initialForm = Object.fromEntries(T.en.questions.map(q => [q.key, '']))

export default function App() {
  const [lang, setLang] = useState('en')
  const [form, setForm] = useState({ ...initialForm, liked: '', improve: '', name: '', table_number: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const t = T[lang]
  const questions = t.questions
  const set = (key, val) => {
    // always store English value in DB
    const engVal = lang === 'am' ? (sentimentKeyMap[val] ?? val) : val
    setForm(f => ({ ...f, [key]: engVal }))
  }
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
    window.scrollTo(0, 0)
  }

  if (submitted) {
    return (
      <div className="app">
        <div className="card success-card">
          <img src={logo} alt="Nelliy's Coffee" className="logo-img" />
          <div className="success-icon">🎉</div>
          <h2>{t.thankYou(form.name)}</h2>
          <p>{t.thankYouSub}</p>
          <div className="summary-grid">
            {T.en.questions.map(q => (
              <div key={q.key} className="summary-row">
                <span className="summary-q">{q.label}</span>
                <span className="summary-a" style={{ color: sentimentColor[form[q.key]] }}>{form[q.key]}</span>
              </div>
            ))}
            {form.liked && <div className="summary-row"><span className="summary-q">{t.whatLiked}</span><span className="summary-a neutral">{form.liked}</span></div>}
            {form.improve && <div className="summary-row"><span className="summary-q">{t.improvement}</span><span className="summary-a neutral">{form.improve}</span></div>}
          </div>
          <button className="btn" onClick={() => { setForm({ ...initialForm, liked: '', improve: '', name: '', table_number: '' }); setSubmitted(false); window.scrollTo(0, 0) }}>
            {t.submitAnother}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="card">
        <div className="lang-toggle-wrap">
          <button
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
          >EN</button>
          <button
            className={`lang-btn ${lang === 'am' ? 'active' : ''}`}
            onClick={() => setLang('am')}
          >አማ</button>
        </div>

        <div className="header">
          <img src={logo} alt="Nelliy's Coffee" className="logo-img" />
          <p className="tagline">{t.tagline}</p>
        </div>

        {/* Progress bar */}
        <div className="progress-wrap">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-label">{t.answered(answered, questions.length)}</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="questions-list">

            {/* Name + Table row */}
            <div className="q-block fade-in info-row">
              <div className="info-field">
                <p className="q-label">{t.nameLabel} <span className="optional">{t.optional}</span></p>
                <input type="text" placeholder={t.namePlaceholder} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="info-field">
                <p className="q-label">{t.tablLabel} <span className="optional">{t.optional}</span></p>
                <input type="text" placeholder={t.tablePlaceholder} value={form.table_number} onChange={e => setForm(f => ({ ...f, table_number: e.target.value }))} />
              </div>
            </div>

            {questions.map((q, i) => {
              const storedEng = form[q.key]
              const selectedOpt = storedEng
                ? (lang === 'am' ? (q.options.find(o => (sentimentKeyMap[o] ?? o) === storedEng) ?? storedEng) : storedEng)
                : ''
              return (
                <div key={q.key} className="q-block fade-in">
                  <p className="q-label"><span className="q-num">{i + 1}</span>{q.label}</p>
                  <div className="chip-group">
                    {q.options.map(opt => (
                      <button
                        key={opt} type="button"
                        className={`chip ${selectedOpt === opt ? 'selected' : ''}`}
                        style={selectedOpt === opt ? { background: sentimentColor[sentimentKeyMap[opt] ?? opt], borderColor: sentimentColor[sentimentKeyMap[opt] ?? opt] } : {}}
                        onClick={() => set(q.key, opt)}
                      >{opt}</button>
                    ))}
                  </div>
                </div>
              )
            })}

            <div className="q-block fade-in">
              <p className="q-label"><span className="q-num">8</span>{t.likedLabel} <span className="optional">{t.optional}</span></p>
              <textarea rows={3} placeholder={t.likedPlaceholder} value={form.liked} onChange={e => setForm(f => ({ ...f, liked: e.target.value }))} maxLength={500} />
            </div>

            <div className="q-block fade-in">
              <p className="q-label"><span className="q-num">9</span>{t.improveLabel} <span className="optional">{t.optional}</span></p>
              <textarea rows={3} placeholder={t.improvePlaceholder} value={form.improve} onChange={e => setForm(f => ({ ...f, improve: e.target.value }))} maxLength={500} />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={!allAnswered || loading} className={`btn btn-submit ${!allAnswered ? 'disabled' : ''}`}>
            {loading ? t.submitting : allAnswered ? t.submit : t.remaining(questions.length - answered)}
          </button>
        </form>
      </div>
    </div>
  )
}
