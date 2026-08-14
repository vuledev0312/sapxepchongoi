export type LayoutStyle = 'grid' | 'u-shape' | 'pairs'
export type ViewMode = '3d' | '2d'
export type ArrangeMode = 'random' | 'name' | 'performance' | 'gender' | 'height'

export interface Student {
  id: string
  name: string
  gender: 'Nam' | 'Nữ' | 'Khác'
  height: number
  weight: number
  performance: number
  priority: boolean
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
  updatedAt: string
}

export interface SeatPosition {
  id: string
  deskIndex: number
  seatIndex: number
  row: number
  column: number
  x: number
  z: number
  rotation: number
}