import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const sql = neon(process.env.DATABASE_URL)
  const { overall, coffee, service, wait, cleanliness, price, recommend, liked, improve, name, table_number } = req.body
  await sql`
    INSERT INTO feedback (overall, coffee, service, wait, cleanliness, price, recommend, liked, improve, name, table_number)
    VALUES (${overall}, ${coffee}, ${service}, ${wait}, ${cleanliness}, ${price}, ${recommend}, ${liked}, ${improve}, ${name}, ${table_number})
  `
  res.status(200).json({ ok: true })
}
