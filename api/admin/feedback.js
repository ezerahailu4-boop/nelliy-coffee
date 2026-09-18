import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    jwt.verify(req.headers.authorization?.split(' ')[1], process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const sql = neon(process.env.DATABASE_URL)
  const data = await sql`SELECT * FROM feedback ORDER BY created_at DESC`
  res.status(200).json(data)
}
