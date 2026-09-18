const base = '/api'

export const submitFeedback = (form) =>
  fetch(`${base}/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    .then(r => r.ok ? null : 'Failed to submit. Please try again.')

export const adminLogin = (password) =>
  fetch(`${base}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
    .then(r => r.json())

export const fetchFeedback = (token) =>
  fetch(`${base}/admin/feedback`, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.ok ? r.json() : [])

export const deleteFeedback = (id, token) =>
  fetch(`${base}/admin/delete?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
