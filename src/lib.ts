import { jsPDF } from 'jspdf'
import type { ArrangeMode, ArrangeScope, Classroom, ColumnGenderRatio, SeatPosition, Student } from './types'

export const DEFAULT_COLUMN_GENDER_RATIO: ColumnGenderRatio = { male: 4, female: 6 }
export const MAX_SEATS_PER_DESK = 6

export const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

/** Tên hiển thị trên sơ đồ: chỉ lấy tên đệm và tên để ô ghế còn đủ chỗ ghi chữ. */
export function getDisplayName(fullName: string) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  return parts.slice(-2).join(' ')
}

export interface StudentImportResult {
  students: Student[]
  errors: string[]
}

type DemoStudentRow = [string, Student['gender'], number, number, number, boolean, string?]

const demoStudentRows: DemoStudentRow[] = [
  ['Nguyễn Minh Anh', 'Nữ', 154, 43, 9.1, true, 'Cận thị, ưu tiên ngồi bàn đầu'],
  ['Trần Quốc Bảo', 'Nam', 168, 57, 7.2, false],
  ['Lê Gia Hân', 'Nữ', 158, 47, 8.6, false, 'Lớp phó học tập'],
  ['Phạm Đức Huy', 'Nam', 171, 61, 6.8, false],
  ['Hoàng Khánh Linh', 'Nữ', 160, 49, 9.4, false, 'Học tốt môn Toán'],
  ['Vũ Nhật Minh', 'Nam', 165, 54, 8.0, true, 'Cần ngồi gần bảng'],
  ['Đỗ Ngọc Anh', 'Nữ', 156, 45, 7.5, false],
  ['Bùi Quang Nam', 'Nam', 173, 65, 6.5, false, 'Thành viên đội bóng rổ'],
  ['Ngô Tuệ Nhi', 'Nữ', 152, 42, 8.9, false],
  ['Dương Anh Quân', 'Nam', 169, 58, 7.8, false, 'Lớp trưởng'],
  ['Lý Thảo Vy', 'Nữ', 161, 50, 8.3, false],
  ['Đặng Tiến Đạt', 'Nam', 175, 67, 7.0, false],
  ['Trịnh Hà My', 'Nữ', 157, 46, 9.0, false, 'Thành viên đội văn nghệ'],
  ['Hồ Minh Khang', 'Nam', 170, 60, 7.6, false],
  ['Phan Bảo Ngọc', 'Nữ', 155, 44, 8.7, true, 'Thính lực yếu, ưu tiên ngồi gần giáo viên'],
  ['Mai Anh Tuấn', 'Nam', 172, 63, 6.9, false],
  ['Nguyễn Khả Hân', 'Nữ', 159, 48, 8.4, false],
  ['Trần Hải Đăng', 'Nam', 167, 55, 7.4, false, 'Tổ trưởng tổ 2'],
  ['Lê Quỳnh Chi', 'Nữ', 153, 43, 9.2, false, 'Học tốt môn Ngữ văn'],
  ['Phạm Gia Bảo', 'Nam', 174, 66, 6.7, false],
  ['Hoàng Yến Nhi', 'Nữ', 162, 51, 8.1, false],
  ['Võ Thành Công', 'Nam', 166, 56, 7.9, false, 'Phụ trách thiết bị lớp'],
  ['Đỗ Thanh Trúc', 'Nữ', 158, 47, 8.8, false],
  ['Bùi Đức Anh', 'Nam', 176, 68, 7.1, false],
  ['Ngô Phương Linh', 'Nữ', 160, 49, 9.3, false, 'Lớp phó văn thể'],
  ['Dương Quốc Khánh', 'Nam', 171, 62, 7.3, true, 'Cận thị, ưu tiên ngồi phía trước'],
  ['Lương Diệu Anh', 'Nữ', 156, 45, 8.5, false],
  ['Đinh Hoàng Long', 'Nam', 178, 70, 6.6, false, 'Chiều cao nổi bật'],
  ['Tạ Mai Phương', 'Nữ', 163, 52, 8.2, false],
  ['Cao Nhật Huy', 'Nam', 169, 59, 7.7, false],
  ['Nguyễn Thùy Dương', 'Nữ', 157, 46, 9.0, false, 'Tổ trưởng tổ 3'],
  ['Trần Trung Kiên', 'Nam', 173, 64, 7.0, false],
  ['Lê Bích Ngọc', 'Nữ', 151, 41, 8.6, true, 'Chiều cao thấp, ưu tiên bàn đầu'],
  ['Phạm Minh Quân', 'Nam', 168, 57, 7.5, false],
  ['Hoàng Thu Trang', 'Nữ', 164, 53, 8.9, false],
  ['Vũ Anh Dũng', 'Nam', 175, 67, 6.8, false, 'Thành viên đội bóng đá'],
  ['Đỗ Hải Yến', 'Nữ', 159, 48, 8.3, false],
  ['Bùi Tuấn Anh', 'Nam', 170, 61, 7.2, false],
  ['Ngô Minh Châu', 'Nữ', 155, 44, 9.1, false, 'Phụ trách sổ đầu bài'],
  ['Dương Đức Thịnh', 'Nam', 172, 63, 7.6, false],
]

export const demoStudents: Student[] = demoStudentRows.map(([name, gender, height, weight, performance, priority, note]) => ({
  id: uid(), name, gender, height, weight, performance, priority, note,
}))

export const legacyDemoStudentNames = demoStudentRows.slice(0, 12).map(([name]) => name)

/** Danh sách mẫu (dùng khi tạo lớp mới hoặc muốn nạp nhanh dữ liệu thử nghiệm). */
export const createSampleStudents = (): Student[] => demoStudents.map(student => ({ ...student, id: uid() }))

/** Số lượng gợi ý khi tạo học sinh ngẫu nhiên. */
export const RANDOM_STUDENT_COUNT_OPTIONS = [10, 20, 30, 40] as const

const randomSurnames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đỗ', 'Bùi', 'Ngô', 'Dương', 'Lý', 'Đặng', 'Trịnh', 'Hồ', 'Phan', 'Mai', 'Võ', 'Đinh', 'Tạ', 'Cao', 'Lương', 'Trương', 'Chu', 'Quách']
const randomMaleNames = ['Minh Anh', 'Quốc Bảo', 'Đức Huy', 'Nhật Minh', 'Quang Nam', 'Anh Quân', 'Tiến Đạt', 'Minh Khang', 'Anh Tuấn', 'Hải Đăng', 'Gia Bảo', 'Thành Công', 'Đức Anh', 'Quốc Khánh', 'Hoàng Long', 'Nhật Huy', 'Trung Kiên', 'Minh Quân', 'Anh Dũng', 'Tuấn Anh', 'Đức Thịnh', 'Bảo Nam', 'Khôi Nguyên', 'Hữu Phước']
const randomFemaleNames = ['Minh Anh', 'Gia Hân', 'Khánh Linh', 'Ngọc Anh', 'Tuệ Nhi', 'Thảo Vy', 'Hà My', 'Bảo Ngọc', 'Khả Hân', 'Quỳnh Chi', 'Yến Nhi', 'Thanh Trúc', 'Phương Linh', 'Diệu Anh', 'Mai Phương', 'Thùy Dương', 'Bích Ngọc', 'Thu Trang', 'Hải Yến', 'Minh Châu', 'Kim Ngân', 'Tuyết Mai', 'Lan Anh', 'Hồng Nhung']
const randomNotes = ['Cận thị, ưu tiên ngồi bàn đầu', 'Lớp trưởng', 'Lớp phó học tập', 'Tổ trưởng', 'Thành viên đội văn nghệ', 'Thành viên đội tuyển Toán', 'Cần ngồi gần bảng', 'Hay nói chuyện, nên ngồi tách nhóm', 'Thính lực yếu, ưu tiên gần giáo viên', 'Phụ trách sổ đầu bài']

const pickRandom = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]
const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Tạo nhanh danh sách học sinh ngẫu nhiên (tên, giới tính, thể chất, học lực hợp lý). */
export function generateRandomStudents(count = 30): Student[] {
  const total = clamp(Math.round(Number(count) || 0), 1, 200)
  const students: Student[] = []
  const usedNames = new Set<string>()
  let attempts = 0
  while (students.length < total) {
    attempts++
    const isFemale = Math.random() < 0.5
    const gender: Student['gender'] = isFemale ? 'Nữ' : 'Nam'
    const name = `${pickRandom(randomSurnames)} ${pickRandom(isFemale ? randomFemaleNames : randomMaleNames)}`
    // Cố gắng tránh trùng tên, nhưng không lặp vô hạn khi danh sách quá dài
    if (usedNames.has(name) && attempts < total * 30) continue
    usedNames.add(name)
    const height = isFemale ? randomInt(148, 170) : randomInt(155, 182)
    const weight = clamp(height - 105 + randomInt(-6, 8), 35, 90)
    const performance = Math.round((5.5 + Math.random() * 4.4) * 10) / 10
    students.push({
      id: uid(), name, gender, height, weight, performance,
      priority: Math.random() < 0.1,
      note: Math.random() < 0.25 ? pickRandom(randomNotes) : undefined,
    })
  }
  return students
}

export function createClassroom(name = 'Lớp 10A1', students?: Student[]): Classroom {
  return {
    id: uid(), name, teacher: 'Nguyễn Thị Mai', rows: 3, columns: 4,
    seatsPerDesk: 2, layout: 'grid', boardSide: 'front',
    students: students ?? demoStudents.map(student => ({ ...student, id: uid() })),
    assignments: {}, lockedSeats: [], deskSeats: {},
    teacherDeskSide: 'right', columnGenderRatio: { ...DEFAULT_COLUMN_GENDER_RATIO },
    updatedAt: new Date().toISOString(),
  }
}

/** Số ghế thực tế của một bàn: ưu tiên số ghế riêng của bàn, nếu không lấy mặc định của lớp. */
export function getDeskSeatCount(room: Classroom, deskIndex: number) {
  const custom = room.deskSeats?.[String(deskIndex)]
  const value = Number.isFinite(custom) ? Number(custom) : room.seatsPerDesk
  return Math.min(MAX_SEATS_PER_DESK, Math.max(1, Math.round(value || 1)))
}

export function getSeats(room: Classroom): SeatPosition[] {
  const seats: SeatPosition[] = []
  const maxSeatCount = Math.max(...Array.from({ length: room.rows * room.columns }, (_, desk) => getDeskSeatCount(room, desk)), 1)
  const stepX = 2.2 + maxSeatCount * 0.7
  const width = Math.max(1, room.columns - 1) * stepX
  const depth = Math.max(1, room.rows - 1) * 3.2
  for (let row = 0; row < room.rows; row++) {
    for (let col = 0; col < room.columns; col++) {
      let x = col * stepX - width / 2
      let z = row * 3.2 - depth / 2 + 0.6
      let rotation = 0
      if (room.layout === 'u-shape') {
        const count = room.rows * room.columns
        const index = row * room.columns + col
        const angle = Math.PI * 0.2 + (index / Math.max(1, count - 1)) * Math.PI * 1.6
        x = Math.cos(angle) * Math.max(4, room.columns * maxSeatCount * 0.6)
        z = Math.sin(angle) * Math.max(3.2, room.rows * 1.5) + 1.8
        rotation = -angle + Math.PI / 2
      } else if (room.layout === 'pairs') {
        x += Math.floor(col / 2) * 0.7
        z += row % 2 ? 0.35 : 0
      }
      const deskIndex = row * room.columns + col
      const seatCount = getDeskSeatCount(room, deskIndex)
      for (let seatIndex = 0; seatIndex < seatCount; seatIndex++) {
        seats.push({ id: `${deskIndex}-${seatIndex}`, deskIndex, seatIndex, seatCount, row, column: col, x, z, rotation })
      }
    }
  }
  return seats
}

const shuffle = <T,>(input: T[]) => {
  const copy = [...input]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function normalizeGenderRatio(ratio?: ColumnGenderRatio): ColumnGenderRatio {
  const male = Math.max(0, Math.round(Number(ratio?.male ?? DEFAULT_COLUMN_GENDER_RATIO.male)) || 0)
  const female = Math.max(0, Math.round(Number(ratio?.female ?? DEFAULT_COLUMN_GENDER_RATIO.female)) || 0)
  if (!male && !female) return { ...DEFAULT_COLUMN_GENDER_RATIO }
  return { male, female }
}

/** Sắp xếp theo từng hàng dọc: mỗi dãy nhận nam/nữ theo tỉ lệ tương đối đã cấu hình. */
function arrangeByColumn(room: Classroom, availableSeats: SeatPosition[], availableStudents: Student[], fixedAssignments: Record<string, string>) {
  const ratio = normalizeGenderRatio(room.columnGenderRatio)
  const maleShare = ratio.male / (ratio.male + ratio.female)
  const males = shuffle(availableStudents.filter(student => student.gender === 'Nam'))
  const females = shuffle(availableStudents.filter(student => student.gender === 'Nữ'))
  const others = shuffle(availableStudents.filter(student => student.gender === 'Khác'))
  const next: Record<string, string> = { ...fixedAssignments }
  const columns = [...new Set(availableSeats.map(seat => seat.column))].sort((a, b) => a - b)
  let maleCarry = 0
  columns.forEach(column => {
    const laneSeats = availableSeats
      .filter(seat => seat.column === column)
      .sort((a, b) => a.row - b.row || a.deskIndex - b.deskIndex || a.seatIndex - b.seatIndex)
    const exactMale = laneSeats.length * maleShare + maleCarry
    let targetMale = Math.round(exactMale)
    targetMale = Math.min(laneSeats.length, Math.max(0, targetMale))
    maleCarry = exactMale - targetMale
    const picked: Student[] = []
    for (let index = 0; index < targetMale && males.length; index++) picked.push(males.shift()!)
    while (picked.length < laneSeats.length && females.length) picked.push(females.shift()!)
    while (picked.length < laneSeats.length && males.length) picked.push(males.shift()!)
    while (picked.length < laneSeats.length && others.length) picked.push(others.shift()!)
    // Ưu tiên gần bảng, phần còn lại xáo ngẫu nhiên trong dãy
    const laneStudents = shuffle(picked).sort((a, b) => Number(b.priority) - Number(a.priority))
    laneSeats.forEach((seat, index) => { if (laneStudents[index]) next[seat.id] = laneStudents[index].id })
  })
  return next
}

export function arrange(room: Classroom, mode: ArrangeMode, scope: ArrangeScope = 'all'): Record<string, string> {
  const seats = getSeats(room)
  const locked = new Set(room.lockedSeats ?? [])
  const fixedAssignments = Object.fromEntries(Object.entries(room.assignments).filter(([seatId]) => locked.has(seatId)))
  const fixedStudentIds = new Set(Object.values(fixedAssignments))
  const availableSeats = seats.filter(seat => !locked.has(seat.id))
  const availableStudents = room.students.filter(student => !fixedStudentIds.has(student.id))

  if (mode === 'column') return arrangeByColumn(room, availableSeats, availableStudents, fixedAssignments)

  if (mode === 'random' && scope === 'lane') {
    const next: Record<string, string> = { ...fixedAssignments }
    const assignedIds = new Set(Object.values(room.assignments))
    const waiting = shuffle(availableStudents.filter(student => !assignedIds.has(student.id)))
    for (let column = 0; column < room.columns; column++) {
      const laneSeats = availableSeats.filter(seat => seat.column === column)
      const laneIds = new Set(laneSeats.map(seat => room.assignments[seat.id]).filter(Boolean))
      const laneStudents = shuffle(availableStudents.filter(student => laneIds.has(student.id)))
      while (laneStudents.length < laneSeats.length && waiting.length) laneStudents.push(waiting.shift()!)
      laneSeats.forEach((seat, index) => { if (laneStudents[index]) next[seat.id] = laneStudents[index].id })
    }
    return next
  }

  const priority = availableStudents.filter(s => s.priority)
  let remaining = availableStudents.filter(s => !s.priority)
  if (mode === 'random') remaining = shuffle(remaining)
  if (mode === 'name') remaining.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  if (mode === 'height') remaining.sort((a, b) => a.height - b.height)
  if (mode === 'performance') {
    const sorted = [...remaining].sort((a, b) => b.performance - a.performance)
    remaining = sorted.flatMap((_, i) => i < Math.ceil(sorted.length / 2) ? [sorted[i], sorted[sorted.length - 1 - i]] : []).slice(0, sorted.length)
  }
  if (mode === 'gender') {
    const groups = [remaining.filter(s => s.gender === 'Nữ'), remaining.filter(s => s.gender === 'Nam'), remaining.filter(s => s.gender === 'Khác')]
    remaining = []
    while (groups.some(g => g.length)) groups.forEach(g => { const item = g.shift(); if (item) remaining.push(item) })
  }
  const ordered = [...priority, ...remaining]
  return {
    ...fixedAssignments,
    ...Object.fromEntries(availableSeats.slice(0, ordered.length).map((seat, index) => [seat.id, ordered[index].id])),
  }
}

function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (char === '"' && line[index + 1] === '"' && quoted) { value += '"'; index++; continue }
    if (char === '"') { quoted = !quoted; continue }
    if (char === delimiter && !quoted) { cells.push(value.trim()); value = ''; continue }
    value += char
  }
  cells.push(value.trim())
  return cells
}

const normalizeHeader = (value: string) => value.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')

export function parseStudents(text: string): StudentImportResult {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (!lines.length) return { students: [], errors: ['Tệp không có dữ liệu.'] }
  const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].split(';').length > lines[0].split(',').length ? ';' : ',')
  const firstCells = splitCsvLine(lines[0], delimiter)
  const aliases: Record<string, string> = {
    hoten: 'name', ten: 'name', name: 'name', gioitinh: 'gender', gender: 'gender',
    chieucao: 'height', height: 'height', cannang: 'weight', weight: 'weight',
    diem: 'performance', hocluc: 'performance', performance: 'performance', uutien: 'priority', priority: 'priority',
    ghichu: 'note', note: 'note', avatar: 'avatar', anhdaidien: 'avatar',
  }
  const normalized = firstCells.map(normalizeHeader)
  const hasHeader = normalized.some(cell => Boolean(aliases[cell]))
  const defaultFields = ['name', 'gender', 'height', 'weight', 'performance', 'priority', 'note', 'avatar']
  const fields = hasHeader ? normalized.map(cell => aliases[cell] ?? '') : defaultFields
  const dataLines = hasHeader ? lines.slice(1) : lines
  const students: Student[] = []
  const errors: string[] = []
  dataLines.forEach((line, index) => {
    const rowNumber = index + (hasHeader ? 2 : 1)
    const cells = splitCsvLine(line, delimiter)
    const data = Object.fromEntries(fields.map((field, cellIndex) => [field, cells[cellIndex]?.trim() ?? '']))
    if (!data.name) { errors.push(`Dòng ${rowNumber}: thiếu Họ tên.`); return }
    const genderText = (data.gender || '').toLowerCase()
    if (genderText && !/^(nam|nữ|nu|khác|khac|m|f)$/i.test(genderText)) { errors.push(`Dòng ${rowNumber}: giới tính phải là Nam, Nữ hoặc Khác.`); return }
    const height = Number(data.height || 160)
    const weight = Number(data.weight || 50)
    const performance = Number(data.performance || 7)
    if (!Number.isFinite(height) || height < 80 || height > 250) { errors.push(`Dòng ${rowNumber}: chiều cao phải từ 80–250 cm.`); return }
    if (!Number.isFinite(weight) || weight < 15 || weight > 250) { errors.push(`Dòng ${rowNumber}: cân nặng phải từ 15–250 kg.`); return }
    if (!Number.isFinite(performance) || performance < 0 || performance > 10) { errors.push(`Dòng ${rowNumber}: điểm phải từ 0–10.`); return }
    students.push({
      id: uid(), name: data.name,
      gender: /^(nữ|nu|f)$/i.test(genderText) ? 'Nữ' : /^(nam|m)$/i.test(genderText) ? 'Nam' : 'Khác',
      height, weight, performance,
      priority: /^(1|x|true|có|co|yes)$/i.test(data.priority || ''),
      note: data.note || undefined, avatar: data.avatar || undefined,
    })
  })
  return { students, errors }
}

export function exportPdf(room: Classroom) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const seats = getSeats(room)
  const students = new Map(room.students.map(s => [s.id, s]))
  const canvas = document.createElement('canvas')
  canvas.width = 1754; canvas.height = 1240
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#263430'
  ctx.font = '700 54px Arial, sans-serif'; ctx.fillText(room.name, canvas.width / 2, 70)
  ctx.font = '28px Arial, sans-serif'; ctx.fillStyle = '#63706b'; ctx.fillText(`Giáo viên chủ nhiệm: ${room.teacher}`, canvas.width / 2, 120)
  const teacherSide = room.teacherDeskSide ?? 'right'
  ctx.fillStyle = '#244f46'; roundedRect(ctx, 250, 160, 1000, 62, 12); ctx.fill()
  ctx.font = '700 30px Arial, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('BẢNG', 750, 192)
  drawTeacherDesk(ctx, teacherSide === 'right' ? 1300 : 60, 158, room.teacher)
  const maxSeatCount = Math.max(...seats.map(seat => seat.seatCount), 1)
  /** Lối đi giữa hai dãy bàn chỉ giữ ở mức tối thiểu để dành chỗ ghi tên. */
  const aisleGap = 14
  const seatGap = 6
  const usableWidth = canvas.width - 200
  const seatWidth = Math.min(170, Math.max(60,
    (usableWidth - (room.columns - 1) * aisleGap - room.columns * (maxSeatCount - 1) * seatGap) / Math.max(1, room.columns * maxSeatCount)))
  const deskWidth = seatWidth * maxSeatCount + (maxSeatCount - 1) * seatGap
  const totalWidth = room.columns * deskWidth + (room.columns - 1) * aisleGap
  const startX = Math.max(60, (canvas.width - totalWidth) / 2)
  const minX = Math.min(...seats.map(s => s.x)); const maxX = Math.max(...seats.map(s => s.x))
  const minZ = Math.min(...seats.map(s => s.z)); const maxZ = Math.max(...seats.map(s => s.z))
  const spanX = Math.max(1, totalWidth - deskWidth)
  seats.forEach(seat => {
    const deskLeft = startX + ((seat.x - minX) / Math.max(1, maxX - minX)) * spanX
    const usedWidth = seat.seatCount * seatWidth + (seat.seatCount - 1) * seatGap
    const x = deskLeft + (deskWidth - usedWidth) / 2 + seat.seatIndex * (seatWidth + seatGap)
    const y = 290 + ((seat.z - minZ) / Math.max(1, maxZ - minZ)) * 720
    const student = students.get(room.assignments[seat.id])
    const isLocked = (room.lockedSeats ?? []).includes(seat.id)
    ctx.fillStyle = student ? '#e0eee5' : '#f4f4f1'; roundedRect(ctx, x, y, seatWidth, 82, 12); ctx.fill()
    ctx.strokeStyle = isLocked ? '#d47758' : '#aeb9b4'; ctx.lineWidth = 3; ctx.stroke()
    if (student?.priority) drawPdfIconBadge(ctx, x + 13, y + 13, 'star', '#c8882d', '#fff4d9')
    if (isLocked) drawPdfIconBadge(ctx, x + seatWidth - 13, y + 13, 'lock', '#b45d45', '#fbe7df')
    // Ghế chỉ ghi tên đệm + tên, phần thông tin chi tiết đã có ở bảng danh sách.
    ctx.fillStyle = student ? '#244f46' : '#929b97'; ctx.font = '700 20px Arial, sans-serif'
    wrapText(ctx, student ? getDisplayName(student.name) : 'Ghế trống', x + seatWidth / 2, y + (student?.note ? 30 : 41), seatWidth - 22, 22)
    if (student?.note) drawStudentInfoBadge(ctx, student.note, x + 9, y + 57, seatWidth - 18)
  })
  ctx.fillStyle = '#6f7975'; ctx.font = '20px Arial, sans-serif'
  ctx.fillText(`Sĩ số: ${room.students.length}  •  Đã xếp: ${Object.keys(room.assignments).length}  •  Sức chứa: ${seats.length}`, canvas.width / 2, 1148)
  drawPdfLegend(ctx, canvas.width / 2, 1192)
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210, undefined, 'FAST')
  pdf.save(`so-do-${room.name.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}

/** Vẽ bàn giáo viên (mặc định đặt bên phải bảng) cho bản PDF. */
function drawTeacherDesk(ctx: CanvasRenderingContext2D, x: number, y: number, teacher: string) {
  const width = 394
  const height = 70
  ctx.fillStyle = '#f3ece2'; roundedRect(ctx, x, y, width, height, 12); ctx.fill()
  ctx.strokeStyle = '#b98b60'; ctx.lineWidth = 3; ctx.stroke()
  ctx.fillStyle = '#8f6547'; roundedRect(ctx, x + 14, y + 15, 60, 40, 8); ctx.fill()
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#7a5a3d'; ctx.font = '700 22px Arial, sans-serif'
  ctx.fillText('BÀN GIÁO VIÊN', x + 88, y + 27)
  const name = teacher?.trim() || 'Chưa có GVCN'
  ctx.fillStyle = '#94714f'
  ctx.font = `${getFittingFontSize(ctx, name, width - 104, 18, 11)}px Arial, sans-serif`
  ctx.fillText(name, x + 88, y + 51)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
}

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const wordStyles = `
@page WordSection1 { size: 29.7cm 21.0cm; mso-page-orientation: landscape; margin: 1.1cm 1.1cm 1.1cm 1.1cm; }
div.WordSection1 { page: WordSection1; }
body { font-family: Arial, sans-serif; font-size: 10pt; color: #263430; }
p { margin: 0pt; mso-line-height-rule: exactly; }
h1 { font-family: Arial, sans-serif; font-size: 18pt; text-align: center; margin: 0pt 0pt 3pt 0pt; }
.sub { text-align: center; color: #63706b; font-size: 9.5pt; margin: 0pt 0pt 9pt 0pt; }
table.map, table.list { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-table-layout-alt: fixed; }
table.map td { border: 0.75pt solid #cfd5d1; padding: 3pt 2pt; vertical-align: middle; text-align: center; }
td.board { background-color: #244f46; border: 0.75pt solid #244f46; color: #ffffff; text-align: center; font-weight: bold; font-size: 12pt; letter-spacing: 2pt; padding: 7pt 4pt; }
td.teacher-desk { border: 0.75pt solid #b98b60; background-color: #f3ece2; text-align: center; padding: 5pt 4pt; }
p.teacher-title { font-weight: bold; color: #7a5a3d; font-size: 9pt; }
p.teacher-name { color: #94714f; font-size: 8pt; }
td.desk-title { background-color: #b98b60; border: 0.75pt solid #8d6847; color: #ffffff; font-size: 7.5pt; padding: 2pt; text-align: center; }
td.seat { border: 0.75pt solid #aac5bb; background-color: #e3eee9; padding: 4pt 2pt; }
td.seat-blank { border: 0.75pt dotted #dbdedb; background-color: #f4f5f2; padding: 4pt 2pt; }
td.seat-locked { border: 1.5pt solid #d47758; background-color: #f9eae4; padding: 4pt 2pt; }
td.aisle { border: 0pt; background-color: #ffffff; font-size: 1pt; padding: 0pt; mso-cellspacing: 0pt; }
td.row-gap { border: 0pt; background-color: #ffffff; font-size: 5pt; padding: 0pt; }
p.seat-name { font-weight: bold; font-size: 9.5pt; color: #244f46; }
p.seat-note { font-size: 7pt; font-weight: bold; }
p.seat-empty { font-size: 8pt; color: #9ba19e; }
table.list { margin-top: 14pt; }
table.list td, table.list th { border: 0.75pt solid #cfd5d1; padding: 3pt 5pt; font-size: 8.5pt; vertical-align: middle; }
table.list th { background-color: #e8efeb; color: #3f4d48; text-align: left; font-size: 8pt; }
table.list td.num { text-align: center; }
.foot { margin-top: 9pt; font-size: 8.5pt; color: #6f7975; text-align: center; }
.legend { margin-top: 4pt; font-size: 7.5pt; color: #79817d; text-align: center; }
.section-title { margin-top: 16pt; font-size: 11pt; font-weight: bold; color: #244f46; }`

/**
 * Xuất sơ đồ ra tệp Word (.doc) dạng bảng để giáo viên mở và chỉnh sửa trực tiếp.
 * Dùng định dạng HTML tương thích Word nên không cần thêm thư viện ngoài.
 */
export function exportWord(room: Classroom) {
  const seats = getSeats(room)
  const students = new Map(room.students.map(student => [student.id, student]))
  const locked = new Set(room.lockedSeats ?? [])
  const teacherSide = room.teacherDeskSide ?? 'right'
  const maxSeatCount = Math.max(...seats.map(seat => seat.seatCount), 1)
  const totalColumns = Math.max(1, room.columns)

  /**
   * Word không dựng được bảng lồng nhau nên sơ đồ được trải phẳng thành một bảng duy nhất:
   * mỗi bàn chiếm `maxSeatCount` cột lưới, giữa hai bàn chèn một cột lối đi mảnh.
   */
  const gridColumns = totalColumns * maxSeatCount + (totalColumns - 1)
  // Lối đi chỉ cần đủ để tách hai dãy bàn; phần rộng còn lại dồn hết cho ô ghi tên.
  const aisleWidth = 8
  const seatWidth = Math.max(24, Math.floor((1000 - aisleWidth * (totalColumns - 1)) / Math.max(1, totalColumns * maxSeatCount)))
  const cols = Array.from({ length: totalColumns }, (_, column) =>
    Array.from({ length: maxSeatCount }, () => `<col style="width:${seatWidth}px">`).join('')
      + (column < totalColumns - 1 ? `<col style="width:${aisleWidth}px">` : ''),
  ).join('')
  const aisleCell = '<td class="aisle">&nbsp;</td>'

  /** Chia đều `maxSeatCount` cột lưới cho số ghế thực tế của bàn, phần dư dồn cho các ghế đầu. */
  const spanFor = (seatCount: number, seatIndex: number) =>
    Math.floor(maxSeatCount / seatCount) + (seatIndex < maxSeatCount % seatCount ? 1 : 0)

  const seatCell = (seatId: string, span: number) => {
    const student = students.get(room.assignments[seatId])
    const isLocked = locked.has(seatId)
    const span2 = span > 1 ? ` colspan="${span}"` : ''
    if (!student) return `<td class="seat-blank"${span2}><p class="seat-empty">Ghế trống</p></td>`
    const note = student.note?.trim()
    const presentation = note ? getStudentNotePresentation(note) : undefined
    const marks = [student.priority ? '★' : '', isLocked ? '⚿' : ''].filter(Boolean).join(' ')
    // Chỉ ghi tên đệm + tên để ô ghế thoáng, không kèm giới tính/chiều cao/điểm.
    return `<td class="${isLocked ? 'seat-locked' : 'seat'}"${span2}>`
      + `<p class="seat-name" title="${escapeHtml(student.name)}">${marks ? `${marks} ` : ''}${escapeHtml(getDisplayName(student.name))}</p>`
      + (note && presentation
        ? `<p class="seat-note" style="color:${presentation.color};background:${presentation.background}">${escapeHtml(abbreviateStudentNote(note))}</p>`
        : '')
      + '</td>'
  }

  const deskRows = Array.from({ length: room.rows }, (_, row) => {
    const titleCells: string[] = []
    const seatCells: string[] = []
    for (let column = 0; column < totalColumns; column++) {
      const deskIndex = row * totalColumns + column
      const deskSeats = seats.filter(seat => seat.deskIndex === deskIndex)
      if (column) { titleCells.push(aisleCell); seatCells.push(aisleCell) }
      titleCells.push(`<td class="desk-title" colspan="${maxSeatCount}">Bàn ${deskIndex + 1} · ${deskSeats.length} ghế</td>`)
      if (deskSeats.length) deskSeats.forEach(seat => seatCells.push(seatCell(seat.id, spanFor(deskSeats.length, seat.seatIndex))))
      else seatCells.push(`<td class="seat-blank" colspan="${maxSeatCount}"><p class="seat-empty">Không có ghế</p></td>`)
    }
    return `<tr>${titleCells.join('')}</tr><tr>${seatCells.join('')}</tr>`
  }).join('')

  // Bảng và bàn giáo viên phải phủ đúng `gridColumns` cột; lớp quá hẹp thì xếp thành hai hàng.
  const teacherSpan = Math.min(Math.max(1, gridColumns - 1), Math.max(maxSeatCount, Math.round(gridColumns * 0.22)))
  const teacherBody = `<p class="teacher-title">BÀN GIÁO VIÊN</p><p class="teacher-name">${escapeHtml(room.teacher || 'Chưa có GVCN')}</p>`
  const stacked = gridColumns < 2 || gridColumns - teacherSpan < 1
  const teacherCell = `<td class="teacher-desk" colspan="${stacked ? gridColumns : teacherSpan}">${teacherBody}</td>`
  const boardCell = `<td class="board" colspan="${stacked ? gridColumns : gridColumns - teacherSpan}">BẢNG</td>`
  const headRow = stacked
    ? (teacherSide === 'right' ? `<tr>${boardCell}</tr><tr>${teacherCell}</tr>` : `<tr>${teacherCell}</tr><tr>${boardCell}</tr>`)
    : (teacherSide === 'right' ? `<tr>${boardCell}${teacherCell}</tr>` : `<tr>${teacherCell}${boardCell}</tr>`)
  const spacerRow = `<tr><td class="row-gap" colspan="${gridColumns}">&nbsp;</td></tr>`

  const studentRows = room.students.map((student, index) => {
    const seatId = Object.keys(room.assignments).find(key => room.assignments[key] === student.id)
    const [deskIndex, seatIndex] = seatId ? seatId.split('-').map(Number) : []
    const place = seatId ? `Bàn ${deskIndex + 1} · Ghế ${seatIndex + 1}` : 'Chưa xếp'
    return `<tr><td class="num">${index + 1}</td><td>${escapeHtml(student.name)}</td><td class="num">${escapeHtml(student.gender)}</td>`
      + `<td class="num">${student.height}</td><td class="num">${student.weight}</td><td class="num">${student.performance.toFixed(1)}</td>`
      + `<td class="num">${student.priority ? 'Ưu tiên' : ''}</td><td>${escapeHtml(student.note ?? '')}</td><td>${place}</td></tr>`
  }).join('')

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><meta name="ProgId" content="Word.Document"><title>${escapeHtml(room.name)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>${wordStyles}</style></head>
<body>
<div class="WordSection1">
<h1>${escapeHtml(room.name)}</h1>
<p class="sub">Giáo viên chủ nhiệm: ${escapeHtml(room.teacher || 'Chưa có GVCN')} · Xuất ngày ${new Date().toLocaleDateString('vi')}</p>
<table class="map" width="100%" style="width:100%;table-layout:fixed"><colgroup>${cols}</colgroup>${headRow}${spacerRow}${deskRows}</table>
<p class="foot">Sĩ số: ${room.students.length} · Đã xếp: ${Object.keys(room.assignments).length} · Sức chứa: ${seats.length} · Tối đa ${maxSeatCount} ghế/bàn</p>
<p class="legend">★ Ưu tiên gần bảng · ⚿ Chỗ cố định · Ghi chú rút gọn theo màu: vai trò, hoạt động, học tập, thể chất</p>
<p class="section-title">Danh sách học sinh</p>
<table class="list" width="100%" style="width:100%"><thead><tr><th>STT</th><th>Họ tên</th><th>Giới tính</th><th>Cao (cm)</th><th>Nặng (kg)</th><th>Điểm</th><th>Ưu tiên</th><th>Ghi chú</th><th>Vị trí</th></tr></thead><tbody>${studentRows}</tbody></table>
</div>
</body></html>`

  const blob = new Blob([`\uFEFF${html}`], { type: 'application/msword;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `so-do-${room.name.toLowerCase().replace(/\s+/g, '-')}.doc`
  link.click()
  URL.revokeObjectURL(link.href)
}

type PdfIcon = 'star' | 'lock' | 'book' | 'ruler' | 'role' | 'activity' | 'note'

function drawStudentInfoBadge(ctx: CanvasRenderingContext2D, note: string, x: number, y: number, width: number) {
  const presentation = getStudentNotePresentation(note)
  const label = abbreviateStudentNote(note)
  ctx.fillStyle = presentation.background
  roundedRect(ctx, x, y, width, 18, 7); ctx.fill()
  drawPdfIcon(ctx, x + 10, y + 9, presentation.icon, presentation.color, 5)
  ctx.save()
  ctx.beginPath(); ctx.rect(x + 19, y, width - 23, 18); ctx.clip()
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = presentation.color
  ctx.font = `600 ${getFittingFontSize(ctx, label, width - 27, 11, 7)}px Arial, sans-serif`
  ctx.fillText(label, x + 20, y + 9)
  ctx.restore()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
}

function abbreviateStudentNote(note: string) {
  const exactRules: Array<[RegExp, string | ((match: RegExpMatchArray) => string)]> = [
    [/^lớp trưởng$/i, 'LT'],
    [/^lớp phó\s+(.+)$/i, match => `LP ${match[1]}`],
    [/^tổ trưởng(?:\s+tổ)?\s*(\d+)?$/i, match => `TT${match[1] ? ` tổ ${match[1]}` : ''}`],
    [/^tổ phó(?:\s+tổ)?\s*(\d+)?$/i, match => `TP${match[1] ? ` tổ ${match[1]}` : ''}`],
    [/^học tốt môn\s+(.+)$/i, match => `Tốt: ${match[1]}`],
    [/^thành viên đội\s+(.+)$/i, match => `Đội ${match[1]}`],
    [/^phụ trách thiết bị(?: lớp)?$/i, 'PT thiết bị'],
    [/^phụ trách sổ đầu bài$/i, 'PT sổ ĐB'],
    [/^chiều cao nổi bật$/i, 'Cao nổi bật'],
    [/^cần ngồi gần bảng$/i, 'Gần bảng'],
    [/^cận thị,?\s*ưu tiên ngồi bàn đầu$/i, 'Cận • Bàn 1'],
    [/^cận thị,?\s*ưu tiên ngồi phía trước$/i, 'Cận • Phía trước'],
    [/^thính lực yếu,?\s*ưu tiên ngồi gần giáo viên$/i, 'Thính lực • Gần GV'],
    [/^chiều cao thấp,?\s*ưu tiên bàn đầu$/i, 'Thấp • Bàn 1'],
  ]
  for (const [pattern, replacement] of exactRules) {
    const match = note.trim().match(pattern)
    if (match) return typeof replacement === 'function' ? replacement(match) : replacement
  }
  return note.trim()
    .replace(/thành viên/gi, 'TV')
    .replace(/phụ trách/gi, 'PT')
    .replace(/giáo viên/gi, 'GV')
    .replace(/học sinh/gi, 'HS')
    .replace(/chiều cao/gi, 'C.cao')
    .replace(/ưu tiên/gi, 'ƯT')
    .replace(/ngồi gần/gi, 'gần')
    .replace(/\s+/g, ' ')
}

function getStudentNotePresentation(note: string): { icon: PdfIcon; color: string; background: string } {
  const normalized = note.toLocaleLowerCase('vi')
  if (/(lớp trưởng|lớp phó|tổ trưởng|tổ phó|phụ trách|cán sự)/.test(normalized)) return { icon: 'role', color: '#8d5546', background: '#f7e9e4' }
  if (/(đội|văn nghệ|thể thao|bóng|câu lạc bộ|clb|hoạt động)/.test(normalized)) return { icon: 'activity', color: '#74619a', background: '#eee9f6' }
  if (/(học|môn|điểm|văn|toán|anh|lý|hóa|sinh)/.test(normalized)) return { icon: 'book', color: '#446f82', background: '#e8f1f4' }
  if (/(cao|thấp|chiều cao|thể chất|sức khỏe|mắt|cận|thính lực)/.test(normalized)) return { icon: 'ruler', color: '#8a6a2a', background: '#f6efdc' }
  return { icon: 'note', color: '#527166', background: '#e9f1ed' }
}

function drawPdfIconBadge(ctx: CanvasRenderingContext2D, x: number, y: number, icon: PdfIcon, color: string, background: string) {
  ctx.fillStyle = background; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill()
  drawPdfIcon(ctx, x, y, icon, color, 6)
}

function drawPdfLegend(ctx: CanvasRenderingContext2D, centerX: number, y: number) {
  const items: Array<{ icon: PdfIcon; label: string; color: string }> = [
    { icon: 'star', label: 'Ưu tiên gần bảng', color: '#c8882d' },
    { icon: 'book', label: 'Học tập', color: '#446f82' },
    { icon: 'ruler', label: 'Thể chất', color: '#8a6a2a' },
    { icon: 'role', label: 'Vai trò', color: '#8d5546' },
    { icon: 'activity', label: 'Hoạt động', color: '#74619a' },
    { icon: 'lock', label: 'Chỗ cố định', color: '#b45d45' },
  ]
  ctx.font = '15px Arial, sans-serif'
  const itemWidths = items.map(item => 24 + ctx.measureText(item.label).width + 22)
  let x = centerX - itemWidths.reduce((sum, width) => sum + width, 0) / 2
  items.forEach((item, index) => {
    drawPdfIcon(ctx, x + 7, y, item.icon, item.color, 6)
    ctx.textAlign = 'left'; ctx.fillStyle = '#68736f'; ctx.fillText(item.label, x + 20, y)
    x += itemWidths[index]
  })
  ctx.textAlign = 'center'
}

function drawPdfIcon(ctx: CanvasRenderingContext2D, x: number, y: number, icon: PdfIcon, color: string, size: number) {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1.5, size * .24); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  if (icon === 'star') {
    ctx.beginPath()
    for (let point = 0; point < 10; point++) { const angle = -Math.PI / 2 + point * Math.PI / 5; const radius = point % 2 ? size * .45 : size; const px = x + Math.cos(angle) * radius; const py = y + Math.sin(angle) * radius; if (!point) ctx.moveTo(px, py); else ctx.lineTo(px, py) }
    ctx.closePath(); ctx.fill()
  } else if (icon === 'lock') {
    ctx.strokeRect(x - size * .65, y - size * .05, size * 1.3, size * .9); ctx.beginPath(); ctx.arc(x, y - size * .1, size * .48, Math.PI, 0); ctx.stroke()
  } else if (icon === 'book') {
    ctx.beginPath(); ctx.moveTo(x, y - size * .65); ctx.lineTo(x, y + size * .65); ctx.moveTo(x, y - size * .5); ctx.quadraticCurveTo(x - size * .7, y - size * .75, x - size, y - size * .35); ctx.lineTo(x - size, y + size * .55); ctx.quadraticCurveTo(x - size * .5, y + size * .35, x, y + size * .65); ctx.moveTo(x, y - size * .5); ctx.quadraticCurveTo(x + size * .7, y - size * .75, x + size, y - size * .35); ctx.lineTo(x + size, y + size * .55); ctx.quadraticCurveTo(x + size * .5, y + size * .35, x, y + size * .65); ctx.stroke()
  } else if (icon === 'ruler') {
    ctx.strokeRect(x - size, y - size * .38, size * 2, size * .76); for (let mark = -.55; mark <= .55; mark += .55) { ctx.beginPath(); ctx.moveTo(x + mark * size, y - size * .38); ctx.lineTo(x + mark * size, y); ctx.stroke() }
  } else if (icon === 'role') {
    ctx.beginPath(); ctx.arc(x, y - size * .45, size * .35, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y + size * .75, size * .7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke()
  } else if (icon === 'activity') {
    ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size * .25, y - size * .25); ctx.lineTo(x + size, y); ctx.lineTo(x + size * .25, y + size * .25); ctx.lineTo(x, y + size); ctx.lineTo(x - size * .25, y + size * .25); ctx.lineTo(x - size, y); ctx.lineTo(x - size * .25, y - size * .25); ctx.closePath(); ctx.fill()
  } else {
    ctx.beginPath(); ctx.roundRect(x - size, y - size * .7, size * 2, size * 1.25, 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - size * .45, y + size * .55); ctx.lineTo(x - size * .7, y + size); ctx.lineTo(x, y + size * .55); ctx.stroke()
  }
  ctx.restore()
}

function getFittingFontSize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, preferredSize: number, minimumSize: number) {
  for (let size = preferredSize; size > minimumSize; size--) {
    ctx.font = `600 ${size}px Arial, sans-serif`
    if (ctx.measureText(text).width <= maxWidth) return size
  }
  return minimumSize
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius)
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let line = ''
  words.forEach(word => { const test = line ? `${line} ${word}` : word; if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word } else line = test })
  if (line) lines.push(line)
  lines.slice(0, 2).forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight))
}

/** Tải một tệp văn bản (kèm BOM để Excel đọc đúng tiếng Việt). */
function downloadTextFile(content: string, fileName: string, mime: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: mime })
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = fileName; link.click(); URL.revokeObjectURL(link.href)
}

const toCsvRow = (row: string[]) => row.map(value => `"${(value ?? '').replace(/"/g, '""')}"`).join(',')

/** Bỏ dấu và ký tự đặc biệt để đặt tên tệp an toàn. */
function slugify(value: string) {
  return (value || 'danh-sach')
    .toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'danh-sach'
}

export function downloadStudentTemplate(format: 'csv' | 'txt' = 'csv') {
  const delimiter = format === 'csv' ? ',' : '\t'
  const rows = [
    ['Họ tên', 'Giới tính', 'Chiều cao', 'Cân nặng', 'Điểm', 'Ưu tiên', 'Ghi chú', 'Avatar'],
    ['Nguyễn Văn An', 'Nam', '165', '54', '8.2', 'x', 'Cần ngồi gần bảng', 'https://example.com/avatar.jpg'],
    ['Trần Mai Anh', 'Nữ', '158', '47', '9.0', '', '', ''],
  ]
  const content = rows.map(row => format === 'csv' ? toCsvRow(row) : row.join(delimiter)).join('\r\n')
  downloadTextFile(content, `mau-danh-sach-hoc-sinh.${format}`, format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8')
}

/** Nội dung CSV của danh sách học sinh (cùng định dạng cột với chức năng nhập danh sách). */
export function studentsToCsv(room: Classroom) {
  const seatByStudent = new Map(Object.entries(room.assignments).map(([seatId, studentId]) => [studentId, seatId]))
  const rows: string[][] = [['Họ tên', 'Giới tính', 'Chiều cao', 'Cân nặng', 'Điểm', 'Ưu tiên', 'Ghi chú', 'Avatar', 'Bàn', 'Ghế']]
  room.students.forEach(student => {
    const seatId = seatByStudent.get(student.id)
    const [deskIndex, seatIndex] = seatId ? seatId.split('-').map(Number) : []
    rows.push([
      student.name, student.gender, String(student.height), String(student.weight), student.performance.toFixed(1),
      student.priority ? 'x' : '', student.note ?? '', student.avatar ?? '',
      seatId ? String(deskIndex + 1) : '', seatId ? String(seatIndex + 1) : '',
    ])
  })
  return rows.map(toCsvRow).join('\r\n')
}

/** Xuất danh sách học sinh của lớp ra tệp CSV. */
export function exportStudentsCsv(room: Classroom) {
  downloadTextFile(studentsToCsv(room), `danh-sach-hoc-sinh-${slugify(room.name)}.csv`, 'text/csv;charset=utf-8')
}