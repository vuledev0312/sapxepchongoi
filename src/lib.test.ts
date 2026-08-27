import { describe, expect, it } from 'vitest'
import { applyLastRowRule, arrange, createClassroom, getDefaultSchoolYear, getSeats, normalizeLastRowRule, uid } from './lib'
import type { Classroom, LastRowRule, Student } from './types'

const makeStudent = (name: string, gender: Student['gender']): Student => ({
  id: uid(), name, gender, height: 160, weight: 50, performance: 8, priority: false,
})

/** Lớp 3 hàng × 4 cột, 2 ghế/bàn (24 ghế) với số nam/nữ đủ dùng cho mọi quy ước. */
function makeRoom(males: number, females: number): Classroom {
  const students = [
    ...Array.from({ length: males }, (_, i) => makeStudent(`Nam ${i + 1}`, 'Nam')),
    ...Array.from({ length: females }, (_, i) => makeStudent(`Nữ ${i + 1}`, 'Nữ')),
  ]
  return { ...createClassroom('Lớp kiểm thử', students), rows: 3, columns: 4, seatsPerDesk: 2 }
}

const lastRowGenders = (room: Classroom, assignments: Record<string, string>) => {
  const byId = new Map(room.students.map(student => [student.id, student]))
  const lastRow = room.boardSide === 'back' ? 0 : room.rows - 1
  return getSeats(room)
    .filter(seat => seat.row === lastRow)
    .sort((a, b) => a.column - b.column || a.seatIndex - b.seatIndex)
    .map(seat => byId.get(assignments[seat.id])?.gender)
}

describe('getDefaultSchoolYear', () => {
  it('bắt đầu năm học mới từ tháng 8', () => {
    expect(getDefaultSchoolYear(new Date(2026, 7, 1))).toBe('2026 – 2027')
  })

  it('vẫn thuộc năm học trước nếu đang ở tháng 1–7', () => {
    expect(getDefaultSchoolYear(new Date(2026, 4, 20))).toBe('2025 – 2026')
  })
})

describe('normalizeLastRowRule', () => {
  it('giữ nguyên giá trị hợp lệ và trả về "none" cho dữ liệu lạ', () => {
    expect(normalizeLastRowRule('mixed')).toBe('mixed')
    expect(normalizeLastRowRule('không-tồn-tại')).toBe('none')
    expect(normalizeLastRowRule(undefined)).toBe('none')
  })
})

describe('quy ước dãy bàn cuối', () => {
  it('không đổi gì khi chọn "none"', () => {
    const room = makeRoom(12, 12)
    const assignments = arrange({ ...room, lastRowRule: 'none' }, 'random')
    expect(Object.keys(assignments).length).toBeGreaterThan(0)
  })

  it.each<[LastRowRule, Student['gender']]>([
    ['male', 'Nam'],
    ['female', 'Nữ'],
  ])('xếp dãy cuối toàn %s', (rule, gender) => {
    const room = { ...makeRoom(12, 12), lastRowRule: rule }
    const genders = lastRowGenders(room, arrange(room, 'random'))
    expect(genders).toHaveLength(8)
    expect(genders.every(value => value === gender)).toBe(true)
  })

  it('xếp dãy cuối nam nữ xen kẽ', () => {
    const room = { ...makeRoom(12, 12), lastRowRule: 'mixed' as LastRowRule }
    expect(lastRowGenders(room, arrange(room, 'random'))).toEqual(['Nam', 'Nữ', 'Nam', 'Nữ', 'Nam', 'Nữ', 'Nam', 'Nữ'])
  })

  it('không bỏ trống ghế khi lớp không đủ học sinh nam', () => {
    // Chỉ 3 nam nên dãy cuối 8 ghế không thể toàn nam; các ghế còn lại vẫn phải có người.
    const room = { ...makeRoom(3, 21), lastRowRule: 'male' as LastRowRule }
    const genders = lastRowGenders(room, arrange(room, 'random'))
    expect(genders.filter(value => value === 'Nam')).toHaveLength(3)
    expect(genders.every(Boolean)).toBe(true)
  })

  it('giữ nguyên học sinh ở ghế đã khóa trong dãy cuối', () => {
    const base = makeRoom(12, 12)
    const seats = getSeats(base)
    const lockedSeat = seats.find(seat => seat.row === base.rows - 1)!
    const girl = base.students.find(student => student.gender === 'Nữ')!
    const room: Classroom = {
      ...base, lastRowRule: 'male',
      lockedSeats: [lockedSeat.id], assignments: { [lockedSeat.id]: girl.id },
    }
    expect(arrange(room, 'random')[lockedSeat.id]).toBe(girl.id)
  })

  it('không xếp trùng một học sinh vào hai ghế', () => {
    const room = { ...makeRoom(12, 12), lastRowRule: 'mixed' as LastRowRule }
    const assigned = Object.values(arrange(room, 'random'))
    expect(new Set(assigned).size).toBe(assigned.length)
  })

  it('chọn hàng đầu là dãy cuối khi bảng nằm phía sau lớp', () => {
    const room: Classroom = { ...makeRoom(12, 12), boardSide: 'back', lastRowRule: 'female' }
    const assignments = arrange(room, 'random')
    expect(lastRowGenders(room, assignments).every(value => value === 'Nữ')).toBe(true)
    const byId = new Map(room.students.map(student => [student.id, student]))
    const actualBackRow = getSeats(room).filter(seat => seat.row === room.rows - 1)
    expect(actualBackRow.some(seat => byId.get(assignments[seat.id])?.gender === 'Nam')).toBe(true)
  })

  it('áp dụng được trực tiếp lên sơ đồ đang có mà không cần xáo lại toàn lớp', () => {
    const base = makeRoom(12, 12)
    const current = arrange({ ...base, lastRowRule: 'none' }, 'random')
    const room: Classroom = { ...base, assignments: current, lastRowRule: 'female' }
    const next = applyLastRowRule(room, current, 'female')
    expect(lastRowGenders(room, next).every(value => value === 'Nữ')).toBe(true)
    // Tổng số học sinh có chỗ không được giảm sau khi đổi quy ước
    expect(Object.keys(next).length).toBe(Object.keys(current).length)
  })
})

describe('ưu tiên ba hàng gần bảng', () => {
  it('xếp đủ hai học sinh cho mỗi bàn trong ba hàng gần bảng khi sĩ số đủ', () => {
    const room: Classroom = {
      ...makeRoom(8, 8), rows: 4, columns: 2, seatsPerDesk: 2, lastRowRule: 'male',
    }
    const assignments = arrange(room, 'random')
    const frontSeats = getSeats(room).filter(seat => [0, 1, 2].includes(seat.row))
    expect(frontSeats).toHaveLength(12)
    expect(frontSeats.every(seat => assignments[seat.id])).toBe(true)
    expect(lastRowGenders(room, assignments).every(gender => gender === 'Nam')).toBe(true)
  })

  it('đảo ba hàng gần bảng khi bảng nằm phía sau', () => {
    const room: Classroom = {
      ...makeRoom(8, 8), rows: 4, columns: 2, seatsPerDesk: 2, boardSide: 'back', lastRowRule: 'male',
    }
    const assignments = arrange(room, 'random')
    const frontSeats = getSeats(room).filter(seat => [1, 2, 3].includes(seat.row))
    expect(frontSeats.every(seat => assignments[seat.id])).toBe(true)
    expect(lastRowGenders(room, assignments).every(gender => gender === 'Nam')).toBe(true)
  })
})


describe('xáo học sinh trong vùng chọn', () => {
  it('chỉ hoán đổi học sinh ở ghế đã chọn và không khóa', async () => {
    const { shuffleSelectedAssignments } = await import('./lib')
    const room = makeRoom(3, 3)
    const seats = getSeats(room)
    const assignments = Object.fromEntries(seats.slice(0, 6).map((seat, index) => [seat.id, room.students[index].id]))
    const lockedSeat = seats[1]
    const source: Classroom = { ...room, assignments, lockedSeats: [lockedSeat.id] }
    const result = shuffleSelectedAssignments(source, [seats[0].id, lockedSeat.id, seats[2].id], () => 0)
    expect(result[lockedSeat.id]).toBe(assignments[lockedSeat.id])
    expect(result[seats[0].id]).toBe(assignments[seats[2].id])
    expect(result[seats[2].id]).toBe(assignments[seats[0].id])
    expect(result[seats[3].id]).toBe(assignments[seats[3].id])
  })
})

