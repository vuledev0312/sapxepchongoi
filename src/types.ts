export type LayoutStyle = 'grid' | 'u-shape' | 'pairs'
export type ViewMode = '3d' | '2d'
export type ArrangeMode = 'random' | 'name' | 'performance' | 'gender' | 'height' | 'column'
export type ArrangeScope = 'all' | 'lane'
/** Quy ước giới tính cho dãy bàn cuối (dãy xa bảng nhất). */
export type LastRowRule = 'none' | 'male' | 'female' | 'mixed'

export interface ColumnGenderRatio {
  male: number
  female: number
}

export interface Student {
  id: string
  name: string
  gender: 'Nam' | 'Nữ' | 'Khác'
  height: number
  weight: number
  performance: number
  priority: boolean
  /** Chức vụ trong lớp: lớp trưởng, lớp phó, tổ trưởng… In kèm dưới tên khi xuất sơ đồ. */
  role?: string
  note?: string
  avatar?: string
}

export interface Classroom {
  id: string
  name: string
  teacher: string
  rows: number
  columns: number
  seatsPerDesk: number
  layout: LayoutStyle
  boardSide: 'front' | 'back'
  students: Student[]
  assignments: Record<string, string>
  lockedSeats?: string[]
  /** Ghi đè số ghế cho từng bàn (khóa là chỉ số bàn). Bàn không khai báo dùng seatsPerDesk. */
  deskSeats?: Record<string, number>
  /** Vị trí bàn giáo viên so với bảng. */
  teacherDeskSide?: 'left' | 'right'
  /** Tỉ lệ nam/nữ tương đối trên mỗi hàng dọc. */
  columnGenderRatio?: ColumnGenderRatio
  /** Quy ước giới tính cho dãy bàn cuối: toàn nam, toàn nữ hoặc nam nữ xen kẽ. */
  lastRowRule?: LastRowRule
  /** Năm học in trên bản PDF, ví dụ “2026 – 2027”. */
  schoolYear?: string
  updatedAt: string
}

export interface SeatPosition {
  id: string
  deskIndex: number
  seatIndex: number
  seatCount: number
  row: number
  column: number
  x: number
  z: number
  rotation: number
}