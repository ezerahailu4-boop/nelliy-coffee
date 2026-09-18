import jwt from 'jsonwebtoken'

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { password } = req.body
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid password' })
  const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '10h' })
  res.status(200).json({ token })
}
