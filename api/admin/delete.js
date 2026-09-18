import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end()
  try {
    jwt.verify(req.headers.authorization?.split(' ')[1], process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const { id } = req.query
  const sql = neon(process.env.DATABASE_URL)
  await sql`DELETE FROM feedback WHERE id = ${id}`
  res.status(200).json({ ok: true })
}
