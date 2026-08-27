import type { Classroom } from './types'

const DATABASE_KEY = 'classroom-3d-database-v2'
export const ACTIVE_USERNAME_KEY = 'classroom-3d-active-username-v1'
const LEGACY_ROOMS_KEY = 'classroom-3d-data-v1'
const LEGACY_PROFILE_KEY = 'classroom-3d-profile-v1'

export interface TeacherProfile {
  name: string
  role: string
  email: string
  school: string
}

export interface UserWorkspace {
  username: string
  rooms: Classroom[]
  profile: TeacherProfile
  activeRoomId?: string
  updatedAt: string
}

type ClassroomDatabase = Record<string, UserWorkspace>

export const normalizeUsername = (value: string) => value.trim().replace(/\s+/g, ' ')
export const usernameKey = (username: string) => normalizeUsername(username).toLocaleLowerCase('vi-VN')

function readDatabase(): ClassroomDatabase {
  try {
    const raw = localStorage.getItem(DATABASE_KEY)
    return raw ? JSON.parse(raw) as ClassroomDatabase : {}
  } catch {
    return {}
  }
}

function writeDatabase(database: ClassroomDatabase) {
  localStorage.setItem(DATABASE_KEY, JSON.stringify(database))
}

export function createDefaultProfile(username: string): TeacherProfile {
  return { name: username, role: 'Giáo viên', email: '', school: '' }
}

/** Lấy workspace riêng theo username; tự chuyển dữ liệu một người dùng từ bản cũ nếu có. */
export function loadWorkspace(username: string): UserWorkspace | null {
  const normalized = normalizeUsername(username)
  if (!normalized) return null
  const key = usernameKey(normalized)
  const database = readDatabase()
  if (database[key]) return database[key]

  try {
    const legacyRooms = localStorage.getItem(LEGACY_ROOMS_KEY)
    if (legacyRooms && Object.keys(database).length === 0) {
      const legacyProfile = localStorage.getItem(LEGACY_PROFILE_KEY)
      const workspace: UserWorkspace = {
        username: normalized,
        rooms: JSON.parse(legacyRooms) as Classroom[],
        profile: legacyProfile ? JSON.parse(legacyProfile) as TeacherProfile : createDefaultProfile(normalized),
        updatedAt: new Date().toISOString(),
      }
      database[key] = workspace
      writeDatabase(database)
      return workspace
    }
  } catch { /* Dữ liệu cũ lỗi thì tạo workspace mới. */ }
  return null
}

export function saveWorkspace(workspace: UserWorkspace) {
  const username = normalizeUsername(workspace.username)
  if (!username) return
  const database = readDatabase()
  database[usernameKey(username)] = { ...workspace, username, updatedAt: new Date().toISOString() }
  writeDatabase(database)
}

/** Lấy workspace dùng chung từ MongoDB Atlas thông qua Vercel Function. */
export async function loadCloudWorkspace(username: string): Promise<UserWorkspace | null> {
  const normalized = normalizeUsername(username)
  if (!normalized) return null
  const response = await fetch(`/api/workspaces/${encodeURIComponent(normalized)}`)
  if (!response.ok) throw new Error(`Không thể tải workspace (${response.status})`)
  const body = await response.json() as { workspace: UserWorkspace | null }
  return body.workspace
}

/** Ghi workspace dùng chung lên MongoDB Atlas thông qua Vercel Function. */
export async function saveCloudWorkspace(workspace: UserWorkspace): Promise<void> {
  const response = await fetch(`/api/workspaces/${encodeURIComponent(normalizeUsername(workspace.username))}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workspace),
  })
  if (!response.ok) throw new Error(`Không thể lưu workspace (${response.status})`)
}

