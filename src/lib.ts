import { jsPDF } from 'jspdf'
import type { ArrangeMode, Classroom, SeatPosition, Student } from './types'

export const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

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

export function createClassroom(name = 'Lớp 10A1'): Classroom {
  return {
    id: uid(), name, teacher: 'Nguyễn Thị Mai', rows: 3, columns: 4,
    seatsPerDesk: 2, layout: 'grid', boardSide: 'front',
    students: demoStudents.map(student => ({ ...student, id: uid() })),
    assignments: {}, lockedSeats: [], updatedAt: new Date().toISOString(),
  }
}

export function getSeats(room: Classroom): SeatPosition[] {
  const seats: SeatPosition[] = []
  const width = Math.max(1, room.columns - 1) * 3.4
  const depth = Math.max(1, room.rows - 1) * 3.2
  for (let row = 0; row < room.rows; row++) {
    for (let col = 0; col < room.columns; col++) {
      let x = col * 3.4 - width / 2
      let z = row * 3.2 - depth / 2 + 0.6
      let rotation = 0
      if (room.layout === 'u-shape') {
        const count = room.rows * room.columns
        const index = row * room.columns + col
        const angle = Math.PI * 0.2 + (index / Math.max(1, count - 1)) * Math.PI * 1.6
        x = Math.cos(angle) * Math.max(4, room.columns * 1.2)
        z = Math.sin(angle) * Math.max(3.2, room.rows * 1.5) + 1.8
        rotation = -angle + Math.PI / 2
      } else if (room.layout === 'pairs') {
        x += Math.floor(col / 2) * 0.7
        z += row % 2 ? 0.35 : 0
      }
      const deskIndex = row * room.columns + col
      for (let seatIndex = 0; seatIndex < room.seatsPerDesk; seatIndex++) {
        seats.push({ id: `${deskIndex}-${seatIndex}`, deskIndex, seatIndex, row, column: col, x, z, rotation })
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

export function arrange(room: Classroom, mode: ArrangeMode, scope: 'all' | 'lane' = 'all'): Record<string, string> {
  const seats = getSeats(room)
  const locked = new Set(room.lockedSeats ?? [])
  const fixedAssignments = Object.fromEntries(Object.entries(room.assignments).filter(([seatId]) => locked.has(seatId)))
  const fixedStudentIds = new Set(Object.values(fixedAssignments))
  const availableSeats = seats.filter(seat => !locked.has(seat.id))
  const availableStudents = room.students.filter(student => !fixedStudentIds.has(student.id))

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
  ctx.fillStyle = '#244f46'; roundedRect(ctx, 250, 160, 1254, 62, 12); ctx.fill()
  ctx.font = '700 30px Arial, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('BẢNG', canvas.width / 2, 192)
  const minX = Math.min(...seats.map(s => s.x)); const maxX = Math.max(...seats.map(s => s.x))
  const minZ = Math.min(...seats.map(s => s.z)); const maxZ = Math.max(...seats.map(s => s.z))
  seats.forEach(seat => {
    const x = 150 + ((seat.x - minX) / Math.max(1, maxX - minX)) * 1260 + seat.seatIndex * 145
    const y = 290 + ((seat.z - minZ) / Math.max(1, maxZ - minZ)) * 720
    const student = students.get(room.assignments[seat.id])
    const isLocked = (room.lockedSeats ?? []).includes(seat.id)
    ctx.fillStyle = student ? '#e0eee5' : '#f4f4f1'; roundedRect(ctx, x, y, 136, 82, 12); ctx.fill()
    ctx.strokeStyle = isLocked ? '#d47758' : '#aeb9b4'; ctx.lineWidth = 3; ctx.stroke()
    if (student?.priority) drawPdfIconBadge(ctx, x + 13, y + 13, 'star', '#c8882d', '#fff4d9')
    if (isLocked) drawPdfIconBadge(ctx, x + 123, y + 13, 'lock', '#b45d45', '#fbe7df')
    ctx.fillStyle = student ? '#244f46' : '#929b97'; ctx.font = '700 18px Arial, sans-serif'
    wrapText(ctx, student?.name ?? 'Ghế trống', x + 68, y + (student?.note ? 28 : 41), 108, 20)
    if (student?.note) drawStudentInfoBadge(ctx, student.note, x + 9, y + 57, 118)
  })
  ctx.fillStyle = '#6f7975'; ctx.font = '20px Arial, sans-serif'
  ctx.fillText(`Sĩ số: ${room.students.length}  •  Đã xếp: ${Object.keys(room.assignments).length}  •  Sức chứa: ${seats.length}`, canvas.width / 2, 1148)
  drawPdfLegend(ctx, canvas.width / 2, 1192)
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210, undefined, 'FAST')
  pdf.save(`so-do-${room.name.toLowerCase().replace(/\s+/g, '-')}.pdf`)
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

export function downloadStudentTemplate(format: 'csv' | 'txt' = 'csv') {
  const delimiter = format === 'csv' ? ',' : '\t'
  const rows = [
    ['Họ tên', 'Giới tính', 'Chiều cao', 'Cân nặng', 'Điểm', 'Ưu tiên', 'Ghi chú', 'Avatar'],
    ['Nguyễn Văn An', 'Nam', '165', '54', '8.2', 'x', 'Cần ngồi gần bảng', 'https://example.com/avatar.jpg'],
    ['Trần Mai Anh', 'Nữ', '158', '47', '9.0', '', '', ''],
  ]
  const content = rows.map(row => row.map(value => format === 'csv' ? `"${value.replace(/"/g, '""')}"` : value).join(delimiter)).join('\r\n')
  const blob = new Blob([`\uFEFF${content}`], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8' })
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `mau-danh-sach-hoc-sinh.${format}`; link.click(); URL.revokeObjectURL(link.href)
}