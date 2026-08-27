import { MongoClient } from 'mongodb'

let clientPromise

function getClient() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured')
  if (!clientPromise) clientPromise = new MongoClient(process.env.MONGODB_URI).connect()
  return clientPromise
}

function normalizeUsername(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function usernameKey(username) {
  return normalizeUsername(username).toLocaleLowerCase('vi-VN')
}

function validWorkspace(value, username) {
  return value && typeof value === 'object'
    && Array.isArray(value.rooms)
    && value.profile && typeof value.profile === 'object'
    && normalizeUsername(value.username) === username
}

export default async function handler(req, res) {
  const username = normalizeUsername(req.query.username)
  if (!username || username.length > 60) return res.status(400).json({ error: 'Username không hợp lệ.' })

  try {
    const client = await getClient()
    const collection = client.db(process.env.MONGODB_DB ?? 'classroom3d').collection('workspaces')
    const key = usernameKey(username)

    if (req.method === 'GET') {
      const workspace = await collection.findOne({ usernameKey: key }, { projection: { _id: 0, usernameKey: 0 } })
      return res.status(200).json({ workspace })
    }

    if (req.method === 'PUT') {
      if (!validWorkspace(req.body, username)) return res.status(400).json({ error: 'Dữ liệu workspace không hợp lệ.' })
      const workspace = { ...req.body, username, updatedAt: new Date().toISOString() }
      await collection.updateOne({ usernameKey: key }, { $set: { ...workspace, usernameKey: key } }, { upsert: true })
      return res.status(200).json({ workspace })
    }

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    console.error('Workspace API error:', error)
    const debug = process.env.DEBUG_DB === '1'
      ? { detail: error?.message, name: error?.name, hasUri: Boolean(process.env.MONGODB_URI) }
      : {}
    return res.status(503).json({ error: 'Không thể kết nối cơ sở dữ liệu.', ...debug })
  }
}
