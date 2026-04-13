import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from './supabase'
import logo from './assets/Nelliys Logo.png'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid
} from 'recharts'
import { QRCodeSVG } from 'qrcode.react'
import './Admin.css'

const SENTIMENT = {
  Excellent: '#22c55e', Good: '#84cc16', Average: '#f59e0b', Poor: '#ef4444',
  Friendly: '#22c55e', Okay: '#f59e0b', 'Needs Improvement': '#ef4444',
  Fast: '#22c55e', Acceptable: '#f59e0b', 'Too Long': '#ef4444',
  'Very Clean': '#22c55e', Clean: '#84cc16',
  Yes: '#22c55e', Fair: '#f59e0b', No: '#ef4444', Maybe: '#f59e0b',
}

const QUESTIONS = [
  { key: 'overall',     label: 'Overall',     icon: '⭐' },
  { key: 'coffee',      label: 'Coffee/Food',  icon: '☕' },
  { key: 'service',     label: 'Service',     icon: '🤝' },
  { key: 'wait',        label: 'Wait Time',   icon: '⏱' },
  { key: 'cleanliness', label: 'Cleanliness', icon: '✨' },
  { key: 'price',       label: 'Price',       icon: '💰' },
  { key: 'recommend',   label: 'Recommend',   icon: '📣' },
]

const SCORE = {
  Excellent: 100, Good: 75, Average: 50, Poor: 0,
  Friendly: 100, Okay: 50, 'Needs Improvement': 0,
  Fast: 100, Acceptable: 50, 'Too Long': 0,
  'Very Clean': 100, Clean: 75,
  Yes: 100, Fair: 50, No: 0, Maybe: 50
}

const scoreOf = val => SCORE[val] ?? 50

function Badge({ value }) {
  return <span className="adm-badge" style={{ background: SENTIMENT[value] || '#94a3b8' }}>{value || '—'}</span>
}

function KpiCard({ icon, label, value, sub, color, trend }) {
  return (
    <div className="kpi-card" style={{ '--accent': color }}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-body">
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
      {trend !== undefined && (
        <div className={`kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}

function tally(feedback, key) {
  const map = {}
  feedback.forEach(f => { const v = f[key]; if (v) map[v] = (map[v] || 0) + 1 })
  return Object.entries(map).map(([name, count]) => ({ name, value: count, count }))
}

function buildTrendData(feedback) {
  const map = {}
  feedback.forEach(f => {
    const d = new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    map[d] = (map[d] || 0) + 1
  })
  return Object.entries(map).slice(-14).map(([date, count]) => ({ date, count }))
}

function exportCSV(feedback) {
  const headers = ['Date', 'Name', 'Table', ...QUESTIONS.map(q => q.label), 'Liked', 'Improve']
  const rows = feedback.map(f => [
    new Date(f.created_at).toLocaleString(),
    f.name || '', f.table_number || '',
    ...QUESTIONS.map(q => f[q.key] || ''),
    f.liked || '', f.improve || ''
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `nelliy-feedback-${Date.now()}.csv`
  a.click()
}

export default function Admin() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [filterRating, setFilterRating] = useState('All')
  const [dashDateRange, setDashDateRange] = useState('all')
  const [respDateRange, setRespDateRange] = useState('all')
  const [deleteId, setDeleteId] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unsatShowAll, setUnsatShowAll] = useState(false)
  const qrRef = useRef()
  const inactiveTimer = useRef(null)

  const INACTIVE_MS = 10 * 60 * 1000

  const resetTimer = () => {
    clearTimeout(inactiveTimer.current)
    inactiveTimer.current = setTimeout(() => supabase.auth.signOut(), INACTIVE_MS)
  }

  useEffect(() => {
    if (!session) return
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()
    return () => {
      clearTimeout(inactiveTimer.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [session])

  const surveyUrl = window.location.origin + '/'
  const closeSidebar = () => setSidebarOpen(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    fetchFeedback()
    // Real-time subscription
    const channel = supabase.channel('feedback-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => fetchFeedback())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [session])

  const fetchFeedback = async () => {
    setLoading(true)
    const { data } = await supabase.from('feedback').select('*').order('created_at', { ascending: false })
    setFeedback(data || [])
    setLoading(false)
  }

  const handleDelete = async id => {
    await supabase.from('feedback').delete().eq('id', id)
    setFeedback(f => f.filter(x => x.id !== id))
    setDeleteId(null)
    setExpanded(null)
  }

  const handleLogin = async e => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoginLoading(false)
    if (error) setLoginError(error.message)
  }

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'nelliy-survey-qr.svg'
    a.click()
  }

  if (!session) {
    return (
      <div className="adm-login-bg">
        <div className="adm-login-card">
          <div className="adm-login-top">
            <img src={logo} alt="Nelliy's Coffee" className="adm-login-logo" />
            <p>Admin Dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="adm-login-form">
            <div className="adm-input-wrap">
              <span className="adm-input-icon">✉</span>
              <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="adm-input-wrap">
              <span className="adm-input-icon">🔒</span>
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {loginError && <div className="adm-login-error">{loginError}</div>}
            <button type="submit" className="adm-login-btn" disabled={loginLoading}>
              {loginLoading ? <span className="adm-spinner" /> : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Filter feedback by date range
  const now = new Date()
  const filtered = useMemo(() => feedback.filter(f => {
    const d = new Date(f.created_at)
    if (dashDateRange === '7d') return (now - d) / 86400000 <= 7
    if (dashDateRange === '30d') return (now - d) / 86400000 <= 30
    return true
  }), [feedback, dashDateRange])

  // Stats
  const total = filtered.length
  const satisfiedList = filtered.filter(f => ['Excellent', 'Good'].includes(f.overall))
  const unsatisfiedList = filtered.filter(f => ['Average', 'Poor'].includes(f.overall))
  const satisfiedCount = satisfiedList.length
  const unsatisfiedCount = unsatisfiedList.length
  const satisfaction = total ? Math.round(satisfiedCount / total * 100) : 0
  const recommendRate = total ? Math.round(filtered.filter(f => f.recommend === 'Yes').length / total * 100) : 0
  const avgScore = total ? Math.round(QUESTIONS.reduce((sum, q) => sum + filtered.reduce((s, f) => s + scoreOf(f[q.key]), 0) / total, 0) / QUESTIONS.length) : 0
  const today = new Date().toDateString()
  const todayCount = feedback.filter(f => new Date(f.created_at).toDateString() === today).length

  const radarData = QUESTIONS.map(q => ({
    label: q.label,
    score: total ? Math.round(filtered.reduce((s, f) => s + scoreOf(f[q.key]), 0) / total) : 0
  }))

  const trendData = useMemo(() => buildTrendData(filtered), [filtered])

  const tallyCache = useMemo(() => ({
    overall: tally(filtered, 'overall'),
    recommend: tally(filtered, 'recommend'),
    coffee: tally(filtered, 'coffee'),
    service: tally(filtered, 'service'),
    wait: tally(filtered, 'wait'),
  }), [filtered])

  // Responses tab filtering
  const respBase = useMemo(() => feedback.filter(f => {
    const d = new Date(f.created_at)
    if (respDateRange === '7d') return (now - d) / 86400000 <= 7
    if (respDateRange === '30d') return (now - d) / 86400000 <= 30
    return true
  }), [feedback, respDateRange])

  const respFiltered = useMemo(() => respBase.filter(f => {
    const matchSearch = search === '' || Object.values(f).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
    const matchRating = filterRating === 'All' || f.overall === filterRating
    return matchSearch && matchRating
  }), [respBase, search, filterRating])

  const TABS = [
    { id: 'dashboard', icon: '▦', label: 'Dashboard' },
    { id: 'responses', icon: '☰', label: 'Responses' },
    { id: 'qr',        icon: '⊞', label: 'QR Code' },
  ]

  return (
    <div className="adm-page">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="adm-overlay" onClick={closeSidebar} />}

      <aside className={`adm-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="adm-sidebar-brand">
          <img src={logo} alt="Nelliy's Coffee" className="adm-sidebar-logo" />
          <div>
            <div className="adm-brand-name">Nelliy's</div>
            <div className="adm-brand-sub">Coffee Admin</div>
          </div>
        </div>
        <nav className="adm-nav">
          {TABS.map(n => (
            <button key={n.id} className={`adm-nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => { setTab(n.id); closeSidebar() }}>
              <span className="adm-nav-icon">{n.icon}</span>
              <span>{n.label}</span>
              {n.id === 'responses' && total > 0 && <span className="adm-nav-badge">{total}</span>}
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-footer">
          <div className="adm-realtime-dot" /><span>Live updates on</span>
        </div>
        <button className="adm-signout" onClick={() => supabase.auth.signOut()}>↩ Sign Out</button>
      </aside>

      <main className="adm-main">
        <div className="adm-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="adm-hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>
            <div>
              <h2 className="adm-page-title">
                {tab === 'dashboard' ? 'Dashboard' : tab === 'responses' ? 'Responses' : 'QR Code'}
              </h2>
              <p className="adm-page-sub">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          <div className="adm-topbar-actions">
            {tab === 'dashboard' && (
              <select className="adm-select" value={dashDateRange} onChange={e => setDashDateRange(e.target.value)}>
                <option value="all">All Time</option>
                <option value="30d">Last 30 Days</option>
                <option value="7d">Last 7 Days</option>
              </select>
            )}
            {tab === 'responses' && (
              <button className="adm-export-btn" onClick={() => exportCSV(respFiltered)}>↓ Export CSV</button>
            )}
            <button className="adm-refresh" onClick={fetchFeedback}>↻ Refresh</button>
          </div>
        </div>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div className="adm-dashboard">
            {total === 0 ? (
              <div className="adm-empty-state">
                <div className="adm-empty-icon">☕</div>
                <h3>No feedback yet</h3>
                <p>Share the QR code with your customers to start collecting responses.</p>
                <button className="adm-refresh" onClick={() => setTab('qr')}>View QR Code →</button>
              </div>
            ) : (<>
            <div className="kpi-row">
              <KpiCard icon="📋" label="Total Responses" value={total} color="#c8813a" />
              <KpiCard icon="😊" label="Satisfaction" value={`${satisfaction}%`} sub="Excellent + Good" color="#22c55e" />
              <KpiCard icon="📣" label="Recommend Rate" value={`${recommendRate}%`} sub="Said Yes" color="#6366f1" />
              <KpiCard icon="⭐" label="Avg Score" value={`${avgScore}%`} sub="All categories" color="#f59e0b" />
              <KpiCard icon="📅" label="Today" value={todayCount} sub="New responses" color="#ec4899" />
            </div>

            {/* Satisfaction breakdown */}
            <div className="sat-breakdown">
              <div className="sat-card sat-happy">
                <div className="sat-icon">😊</div>
                <div className="sat-num">{satisfiedCount}</div>
                <div className="sat-label">Satisfied</div>
                <div className="sat-fraction">{satisfiedCount} out of {total}</div>
                <div className="sat-pct-badge sat-pct-green">{satisfaction}%</div>
                <div className="sat-bar-track">
                  <div className="sat-bar-fill" style={{ width: `${satisfaction}%`, background: '#22c55e' }} />
                </div>
              </div>
              <div className="sat-card sat-sad">
                <div className="sat-icon">😞</div>
                <div className="sat-num">{unsatisfiedCount}</div>
                <div className="sat-label">Unsatisfied</div>
                <div className="sat-fraction">{unsatisfiedCount} out of {total}</div>
                <div className="sat-pct-badge sat-pct-red">{total ? Math.round(unsatisfiedCount / total * 100) : 0}%</div>
                <div className="sat-bar-track">
                  <div className="sat-bar-fill" style={{ width: `${total ? Math.round(unsatisfiedCount / total * 100) : 0}%`, background: '#ef4444' }} />
                </div>
              </div>
              <div className="sat-card sat-neutral">
                <div className="sat-icon">😐</div>
                <div className="sat-num">{total - satisfiedCount - unsatisfiedCount}</div>
                <div className="sat-label">Neutral</div>
                <div className="sat-fraction">{total - satisfiedCount - unsatisfiedCount} out of {total}</div>
                <div className="sat-pct-badge sat-pct-yellow">{total ? Math.round((total - satisfiedCount - unsatisfiedCount) / total * 100) : 0}%</div>
                <div className="sat-bar-track">
                  <div className="sat-bar-fill" style={{ width: `${total ? Math.round((total - satisfiedCount - unsatisfiedCount) / total * 100) : 0}%`, background: '#f59e0b' }} />
                </div>
              </div>
            </div>

            {/* Unsatisfied reasons */}
            {unsatisfiedList.length > 0 && (
              <div className="chart-card">
                <div className="chart-title">⚠️ Unsatisfied Customers — Reasons</div>
                <div className="unsat-list">
                  {(unsatShowAll ? unsatisfiedList : unsatisfiedList.slice(0, 5)).map((f, i) => (
                    <div key={f.id} className="unsat-item">
                      <div className="unsat-header">
                        <span className="unsat-num">#{i + 1}</span>
                        <span className="unsat-date">{new Date(f.created_at).toLocaleString()}</span>
                        {f.name && <span className="unsat-name">{f.name}{f.table_number ? ` · Table ${f.table_number}` : ''}</span>}
                        <Badge value={f.overall} />
                      </div>
                      <div className="unsat-reasons">
                        {QUESTIONS.filter(q => ['Poor', 'Needs Improvement', 'Too Long', 'No'].includes(f[q.key])).map(q => (
                          <div key={q.key} className="unsat-reason-row">
                            <span className="unsat-reason-icon">{q.icon}</span>
                            <span className="unsat-reason-label">{q.label}</span>
                            <Badge value={f[q.key]} />
                          </div>
                        ))}
                        {f.improve && (
                          <div className="unsat-comment">
                            <span>🔧</span>
                            <p>{f.improve}</p>
                          </div>
                        )}
                        {!QUESTIONS.some(q => ['Poor', 'Needs Improvement', 'Too Long', 'No'].includes(f[q.key])) && !f.improve && (
                          <p className="unsat-no-reason">No specific reason provided</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {unsatisfiedList.length > 5 && (
                  <button className="adm-show-more" onClick={() => setUnsatShowAll(v => !v)}>
                    {unsatShowAll ? '▲ Show less' : `▼ Show ${unsatisfiedList.length - 5} more`}
                  </button>
                )}
              </div>
            )}

            {/* Trend line */}
            <div className="chart-card chart-wide">
              <div className="chart-title">Response Trend</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#2c1a0e', border: '1px solid rgba(200,129,58,0.3)', borderRadius: 10, color: '#fdf6ee' }} />
                  <Line type="monotone" dataKey="count" stroke="#c8813a" strokeWidth={2.5} dot={{ fill: '#c8813a', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="charts-row">
              <div className="chart-card">
                <div className="chart-title">Category Scores</div>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(253,246,238,0.5)' }} />
                    <Radar dataKey="score" stroke="#c8813a" fill="#c8813a" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip contentStyle={{ background: '#2c1a0e', border: '1px solid rgba(200,129,58,0.3)', borderRadius: 10, color: '#fdf6ee' }} formatter={v => [`${v}%`]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <div className="chart-title">Overall Experience</div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={tallyCache.overall} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {tallyCache.overall.map((d, i) => <Cell key={i} fill={SENTIMENT[d.name] || '#94a3b8'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#2c1a0e', border: '1px solid rgba(200,129,58,0.3)', borderRadius: 10, color: '#fdf6ee' }} formatter={v => [`${v} responses`]} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <div className="chart-title">Would Recommend?</div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={tallyCache.recommend} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {tallyCache.recommend.map((d, i) => <Cell key={i} fill={SENTIMENT[d.name] || '#94a3b8'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#2c1a0e', border: '1px solid rgba(200,129,58,0.3)', borderRadius: 10, color: '#fdf6ee' }} formatter={v => [`${v} responses`]} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="charts-row">
              {[['coffee', 'Coffee/Food'], ['service', 'Service'], ['wait', 'Wait Time']].map(([key, title]) => (
                <div key={key} className="chart-card">
                  <div className="chart-title">{title}</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={tallyCache[key]} barSize={28}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(253,246,238,0.5)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'rgba(253,246,238,0.5)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#2c1a0e', border: '1px solid rgba(200,129,58,0.3)', borderRadius: 10, color: '#fdf6ee' }} cursor={{ fill: 'rgba(200,129,58,0.06)' }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {tallyCache[key].map((d, i) => <Cell key={i} fill={SENTIMENT[d.name] || '#c8813a'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>

            <div className="chart-card">
              <div className="chart-title">Category Performance</div>
              <div className="score-bars">
                {radarData.map(d => (
                  <div key={d.label} className="score-bar-row">
                    <span className="score-bar-label">{d.label}</span>
                    <div className="score-bar-track">
                      <div className="score-bar-fill" style={{ width: `${d.score}%`, background: d.score >= 75 ? '#22c55e' : d.score >= 50 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <span className="score-bar-pct">{d.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </>)}
          </div>
        )}

        {/* ── RESPONSES ── */}
        {tab === 'responses' && (
          <div className="adm-responses">
            <div className="resp-filters">
              <div className="resp-search-wrap">
                <span>🔍</span>
                <input className="resp-search" placeholder="Search responses..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="adm-select" value={filterRating} onChange={e => setFilterRating(e.target.value)}>
                <option value="All">All Ratings</option>
                {['Excellent', 'Good', 'Average', 'Poor'].map(r => <option key={r}>{r}</option>)}
              </select>
              <select className="adm-select" value={respDateRange} onChange={e => setRespDateRange(e.target.value)}>
                <option value="all">All Time</option>
                <option value="30d">Last 30 Days</option>
                <option value="7d">Last 7 Days</option>
              </select>
              <span className="resp-count">{respFiltered.length} results</span>
            </div>

            {loading ? (
              <div className="adm-center"><span className="adm-spinner" style={{ borderTopColor: '#c8813a', borderColor: 'rgba(200,129,58,0.2)' }} /></div>
            ) : respFiltered.length === 0 ? (
              <div className="adm-center">No responses found.</div>
            ) : (
              <div className="resp-list">
                {respFiltered.map((f, i) => (
                  <div key={f.id} className={`resp-item ${expanded === f.id ? 'open' : ''}`}>
                    <div className="resp-header" onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                      <div className="resp-num">#{respFiltered.length - i}</div>
                      <div className="resp-meta">
                        <span className="resp-date">{new Date(f.created_at).toLocaleString()}</span>
                        <div className="resp-badges">
                          {QUESTIONS.slice(0, 4).map(q => <Badge key={q.key} value={f[q.key]} />)}
                        </div>
                      </div>
                      <span className="resp-chevron">{expanded === f.id ? '▲' : '▼'}</span>
                    </div>
                    {expanded === f.id && (
                      <div className="resp-body">
                        <div className="resp-grid">
                          {QUESTIONS.map(q => (
                            <div key={q.key} className="resp-row">
                              <span className="resp-icon">{q.icon}</span>
                              <span className="resp-q">{q.label}</span>
                              <Badge value={f[q.key]} />
                            </div>
                          ))}
                        </div>
                        {(f.liked || f.improve) && (
                          <div className="resp-texts">
                            {f.liked && <div className="resp-text-block"><span className="resp-text-lbl">💬 What they liked</span><p>{f.liked}</p></div>}
                            {f.improve && <div className="resp-text-block"><span className="resp-text-lbl">🔧 Improvement</span><p>{f.improve}</p></div>}
                          </div>
                        )}
                        <div className="resp-actions">
                          {deleteId === f.id ? (
                            <>
                              <span className="resp-confirm-text">Delete this response?</span>
                              <button className="resp-btn-danger" onClick={() => handleDelete(f.id)}>Yes, Delete</button>
                              <button className="resp-btn-cancel" onClick={() => setDeleteId(null)}>Cancel</button>
                            </>
                          ) : (
                            <button className="resp-btn-delete" onClick={() => setDeleteId(f.id)}>🗑 Delete</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── QR CODE ── */}
        {tab === 'qr' && (
          <div className="adm-qr-page">
            <div className="qr-card" ref={qrRef}>
              <div className="qr-header">
                <span>☕</span>
                <h2>Nelliy's Coffee</h2>
                <p>Scan to share your feedback</p>
              </div>
              <div className="qr-code-wrap">
                <QRCodeSVG value={surveyUrl} size={220} bgColor="transparent" fgColor="#fdf6ee" level="H" />
              </div>
              <div className="qr-url">{surveyUrl}</div>
              <p className="qr-hint">Print this and place it on your tables</p>
            </div>
            <div className="qr-actions">
              <button className="adm-export-btn" onClick={downloadQR}>↓ Download QR (SVG)</button>
              <button className="adm-refresh" onClick={() => window.print()}>🖨 Print</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
