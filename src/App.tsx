import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Armchair, BarChart3, BookOpen, Box, CheckCircle2, ChevronDown, CircleHelp, Copy, Dices, Download, Eraser, FileDown, FileSpreadsheet, FileText, FileUp, Grid2X2, ImagePlus, LayoutDashboard, Lock, LockOpen, Menu, Pencil, Plane, Plus, Rabbit, RotateCcw, Search, Settings2, Shuffle, Sparkles, Trash2, UserRound, Users, Wand2, X } from 'lucide-react'
import ClassroomScene, { type HopRequest, type SceneHandle } from './ClassroomScene'
import { DEFAULT_COLUMN_GENDER_RATIO, MAX_SEATS_PER_DESK, RANDOM_STUDENT_COUNT_OPTIONS, arrange, createClassroom, createSampleStudents, demoStudents, downloadStudentTemplate, exportPdf, exportStudentsCsv, exportWord, generateRandomStudents, getDeskSeatCount, getDisplayName, getSeats, legacyDemoStudentNames, normalizeGenderRatio, parseStudents, studentsToCsv, uid } from './lib'
import type { ArrangeMode, ArrangeScope, Classroom, LayoutStyle, Student, ViewMode } from './types'

const STORAGE_KEY = 'classroom-3d-data-v1'
const PROFILE_KEY = 'classroom-3d-profile-v1'
const FLIGHT_DURATION = 1400
/** Thời gian một cú nhảy đổi chỗ (ms). */
const HOP_DURATION = 850
/** Số học sinh cùng bay một lượt. */
const FLIGHT_BATCH_OPTIONS = [0, 1, 2, 4] as const
/** Cách tạo danh sách khi mở lớp mới. */
type NewRoomSource = 'empty' | 'sample' | 'random'
type WorkspacePage = 'overview' | 'seating' | 'students'
interface TeacherProfile { name: string; role: string; email: string; school: string }

function App() {
  const [rooms, setRooms] = useState<Classroom[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const storedRooms = JSON.parse(saved) as Classroom[]
        return storedRooms.map(storedRoom => {
          // Bổ sung các thiết lập mới cho dữ liệu lưu từ phiên bản trước
          const room: Classroom = {
            ...storedRoom,
            deskSeats: storedRoom.deskSeats ?? {},
            teacherDeskSide: storedRoom.teacherDeskSide ?? 'right',
            columnGenderRatio: normalizeGenderRatio(storedRoom.columnGenderRatio),
          }
          const isLegacyDemo = room.students.length === legacyDemoStudentNames.length
            && legacyDemoStudentNames.every(name => room.students.some(student => student.name === name))
          if (!isLegacyDemo) return room
          const additionalStudents = demoStudents.slice(legacyDemoStudentNames.length).map(student => ({ ...student, id: uid() }))
          return { ...room, students: [...room.students, ...additionalStudents] }
        })
      }
    } catch { /* use demo */ }
    return [createClassroom()]
  })
  const [activeId, setActiveId] = useState(rooms[0].id)
  const [view, setView] = useState<ViewMode>('3d')
  const [page, setPage] = useState<WorkspacePage>('seating')
  const [query, setQuery] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [tourStep, setTourStep] = useState<number | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showArrange, setShowArrange] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [importText, setImportText] = useState('')
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [studentDraft, setStudentDraft] = useState<Omit<Student, 'id'>>({ name: '', gender: 'Khác', height: 160, weight: 50, performance: 7, priority: false, avatar: '', note: '' })
  const [toast, setToast] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [lockMode, setLockMode] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [flightBatch, setFlightBatch] = useState<number>(2)
  const [flights, setFlights] = useState<Record<string, number>>({})
  const flightTimer = useRef<number | null>(null)
  const [hopEffect, setHopEffect] = useState(true)
  const [hops, setHops] = useState<Record<string, HopRequest>>({})
  const hopTimer = useRef<number | null>(null)
  const [showNewRoom, setShowNewRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomSource, setNewRoomSource] = useState<NewRoomSource>('sample')
  const [randomCount, setRandomCount] = useState<number>(30)
  const [profile, setProfile] = useState<TeacherProfile>(() => {
    try { const saved = localStorage.getItem(PROFILE_KEY); if (saved) return JSON.parse(saved) } catch { /* use defaults */ }
    return { name: 'Mai Thu', role: 'Giáo viên', email: 'maithu@school.edu.vn', school: 'Trường THPT Nguyễn Du' }
  })
  const dragStudent = useRef<string | null>(null)
  const sceneHandle = useRef<SceneHandle | null>(null)
  const [scene3dDropTarget, setScene3dDropTarget] = useState<string | null>(null)
  const room = rooms.find(r => r.id === activeId) ?? rooms[0]
  const seats = useMemo(() => getSeats(room), [room])
  const genderRatio = useMemo(() => normalizeGenderRatio(room.columnGenderRatio), [room.columnGenderRatio])
  const studentsById = useMemo(() => new Map(room.students.map(s => [s.id, s])), [room.students])
  const assignedIds = new Set(Object.values(room.assignments))
  const unassigned = room.students.filter(s => !assignedIds.has(s.id) && s.name.toLowerCase().includes(query.toLowerCase()))
  const visibleStudents = room.students.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms)), [rooms])
  useEffect(() => localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)), [profile])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t) }, [toast])
  useEffect(() => () => {
    if (flightTimer.current) window.clearTimeout(flightTimer.current)
    if (hopTimer.current) window.clearTimeout(hopTimer.current)
  }, [])

  const updateRoom = (patch: Partial<Classroom>) => setRooms(list => list.map(r => r.id === room.id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r))
  /** Mở hộp thoại tạo lớp để chọn nguồn danh sách (trống / mẫu / ngẫu nhiên). */
  const addRoom = () => { setNewRoomName(`Lớp mới ${rooms.length + 1}`); setNewRoomSource('sample'); setShowNewRoom(true); setMobileNav(false) }
  const confirmAddRoom = () => {
    const name = newRoomName.trim() || `Lớp mới ${rooms.length + 1}`
    const students = newRoomSource === 'sample' ? createSampleStudents() : newRoomSource === 'random' ? generateRandomStudents(randomCount) : []
    const next = createClassroom(name, students)
    setRooms([...rooms, next]); setActiveId(next.id); setPage('seating'); setShowNewRoom(false); setShowSetup(true)
    setToast(students.length ? `Đã tạo ${name} với ${students.length} học sinh` : `Đã tạo ${name}`)
  }
  const selectRoom = (id: string) => { setActiveId(id); setSelectedStudentId(null); setQuery(''); setMobileNav(false); setShowExport(false); setFlights({}); setHops({}) }
  const duplicateRoom = (source: Classroom) => {
    const copy: Classroom = { ...source, id: uid(), name: `${source.name} (bản sao)`, students: source.students.map(student => ({ ...student, id: uid() })), assignments: {}, lockedSeats: [], updatedAt: new Date().toISOString() }
    setRooms(list => [...list, copy]); setActiveId(copy.id); setPage('seating'); setToast('Đã nhân bản lớp học')
  }
  const deleteRoom = (id: string) => {
    if (rooms.length === 1) return setToast('Cần giữ lại ít nhất một lớp học')
    const target = rooms.find(item => item.id === id)
    if (!target || !window.confirm(`Xóa “${target.name}” và toàn bộ dữ liệu của lớp?`)) return
    const nextRooms = rooms.filter(item => item.id !== id)
    setRooms(nextRooms); if (activeId === id) setActiveId(nextRooms[0].id); setToast('Đã xóa lớp học')
  }
  const navigate = (nextPage: WorkspacePage) => { setPage(nextPage); setMobileNav(false); setShowExport(false) }
  const startTutorial = () => {
    setShowHelp(false)
    setPage('seating')
    setView('2d')
    setShowArrange(false)
    setTourStep(0)
  }
  const finishTutorial = () => setTourStep(null)
  /** Bật hiệu ứng nhảy chỗ cho các ghế vừa đổi người (dùng khi kéo thả / đổi chỗ). */
  const playHop = (moves: { seatId: string; fromSeatId?: string }[]) => {
    if (!hopEffect || !moves.length) return setHops({})
    const startAt = Date.now()
    setHops(Object.fromEntries(moves.map(move => [move.seatId, { startAt, fromSeatId: move.fromSeatId }])))
    if (hopTimer.current) window.clearTimeout(hopTimer.current)
    hopTimer.current = window.setTimeout(() => setHops({}), HOP_DURATION + 120)
  }
  const placeStudent = (seatId: string, studentId: string) => {
    const locked = new Set(room.lockedSeats ?? [])
    const oldSeatId = Object.keys(room.assignments).find(key => room.assignments[key] === studentId)
    if (locked.has(seatId) || (oldSeatId && locked.has(oldSeatId))) {
      setToast('Hãy mở khóa vị trí trước khi di chuyển')
      return
    }
    const next = { ...room.assignments }
    const oldSeat = Object.keys(next).find(key => next[key] === studentId)
    const occupant = next[seatId]
    if (oldSeat) { if (occupant) next[oldSeat] = occupant; else delete next[oldSeat] }
    next[seatId] = studentId
    updateRoom({ assignments: next })
    // Người được kéo nhảy sang ghế mới, người bị đẩy (nếu có) nhảy về ghế cũ
    playHop([{ seatId, fromSeatId: oldSeat }, ...(oldSeat && occupant ? [{ seatId: oldSeat, fromSeatId: seatId }] : [])])
    setSelectedStudentId(null)
    setDropTargetId(null)
  }
  const beginDrag = (event: React.DragEvent, studentId: string) => {
    dragStudent.current = studentId
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', studentId)
  }
  const dropStudent = (event: React.DragEvent, seatId: string) => {
    event.preventDefault()
    const studentId = event.dataTransfer.getData('text/plain') || dragStudent.current
    if (studentId) placeStudent(seatId, studentId)
    dragStudent.current = null
    setDropTargetId(null)
    setScene3dDropTarget(null)
  }
  const swapSeats = (fromSeatId: string, toSeatId: string) => {
    if (fromSeatId === toSeatId) return
    const locked = new Set(room.lockedSeats ?? [])
    if (locked.has(fromSeatId) || locked.has(toSeatId)) {
      setToast('Hãy mở khóa vị trí trước khi di chuyển')
      return
    }
    const next = { ...room.assignments }
    const fromStudent = next[fromSeatId]
    const toStudent = next[toSeatId]
    if (toStudent) next[fromSeatId] = toStudent; else delete next[fromSeatId]
    if (fromStudent) next[toSeatId] = fromStudent; else delete next[toSeatId]
    updateRoom({ assignments: next })
    // Hai bạn nhảy đổi chỗ cho nhau
    playHop([
      ...(fromStudent ? [{ seatId: toSeatId, fromSeatId }] : []),
      ...(toStudent ? [{ seatId: fromSeatId, fromSeatId: toSeatId }] : []),
    ])
  }
  const selectOrPlace = (seatId: string) => {
    if (lockMode) {
      if (!room.assignments[seatId]) return setToast('Chỉ có thể khóa ghế đã có học sinh')
      const locked = new Set(room.lockedSeats ?? [])
      if (locked.has(seatId)) locked.delete(seatId); else locked.add(seatId)
      updateRoom({ lockedSeats: [...locked] })
      return
    }
    if (selectedStudentId) placeStudent(seatId, selectedStudentId)
    else cycleSeat(seatId)
  }
  const cycleSeat = (seatId: string) => {
    if ((room.lockedSeats ?? []).includes(seatId)) return setToast('Vị trí này đang được cố định')
    const occupant = room.assignments[seatId]
    if (occupant) { const next = { ...room.assignments }; delete next[seatId]; updateRoom({ assignments: next }); setToast('Đã đưa học sinh về danh sách chờ') }
    else if (unassigned[0]) placeStudent(seatId, unassigned[0].id)
  }
  /** Tạo lịch bay cho các ghế vừa thay đổi: mỗi lượt bay `flightBatch` học sinh. */
  const startFlights = (nextAssignments: Record<string, string>) => {
    setHops({})
    if (!flightBatch) return setFlights({})
    const changed = seats
      .filter(seat => nextAssignments[seat.id] && nextAssignments[seat.id] !== room.assignments[seat.id])
      .map(seat => seat.id)
    if (!changed.length) return setFlights({})
    const now = Date.now()
    const gap = Math.max(220, FLIGHT_DURATION * 0.45)
    const schedule: Record<string, number> = {}
    changed.forEach((seatId, index) => { schedule[seatId] = now + Math.floor(index / flightBatch) * gap })
    setFlights(schedule)
    if (flightTimer.current) window.clearTimeout(flightTimer.current)
    const total = Math.ceil(changed.length / flightBatch) * gap + FLIGHT_DURATION + 120
    flightTimer.current = window.setTimeout(() => setFlights({}), total)
  }
  const runArrange = (mode: ArrangeMode, scope: ArrangeScope = 'all') => {
    const nextAssignments = arrange(room, mode, scope)
    updateRoom({ assignments: nextAssignments })
    startFlights(nextAssignments)
    setShowArrange(false)
    const messages: Record<string, string> = {
      lane: 'Đã xáo trộn trong từng dãy, giữ nguyên các chỗ khóa',
      column: `Đã xếp theo hàng dọc với tỉ lệ ${genderRatio.male} nam : ${genderRatio.female} nữ`,
    }
    setToast(messages[mode === 'column' ? 'column' : scope] ?? 'Đã sắp xếp toàn lớp, giữ nguyên các chỗ khóa')
  }
  const clearUnlocked = () => {
    const locked = new Set(room.lockedSeats ?? [])
    updateRoom({ assignments: Object.fromEntries(Object.entries(room.assignments).filter(([seatId]) => locked.has(seatId))) })
  }
  const importList = () => {
    const result = parseStudents(importText)
    setImportErrors(result.errors)
    if (result.errors.length) return setToast(`Có ${result.errors.length} dòng cần sửa`)
    if (!result.students.length) return setToast('Chưa có dữ liệu hợp lệ')
    updateRoom({ students: [...room.students, ...result.students] }); setImportText(''); setShowImport(false); setToast(`Đã thêm ${result.students.length} học sinh`)
  }
  /** Đưa danh sách mẫu vào ô nhập để giáo viên xem trước và chỉnh sửa trước khi thêm. */
  const fillSampleList = () => { setImportText(studentsToCsv({ ...room, students: createSampleStudents(), assignments: {} })); setImportErrors([]); setToast('Đã điền danh sách mẫu, bấm “Kiểm tra và thêm”') }
  const fillRandomList = (count: number) => { setImportText(studentsToCsv({ ...room, students: generateRandomStudents(count), assignments: {} })); setImportErrors([]); setToast(`Đã tạo ${count} học sinh ngẫu nhiên`) }
  /** Thêm ngay danh sách mẫu / ngẫu nhiên vào lớp mà không qua bước xem trước. */
  const appendStudents = (students: Student[], message: string) => {
    if (!students.length) return
    updateRoom({ students: [...room.students, ...students] })
    setToast(message)
  }
  const clearAllStudents = () => {
    if (!room.students.length) return setToast('Lớp chưa có học sinh nào')
    if (!window.confirm(`Xóa toàn bộ ${room.students.length} học sinh của “${room.name}”? Sơ đồ chỗ ngồi cũng sẽ được làm trống.`)) return
    updateRoom({ students: [], assignments: {}, lockedSeats: [] })
    setSelectedStudentId(null); setFlights({}); setHops({})
    setToast('Đã xóa toàn bộ danh sách học sinh')
  }
  const exportStudentList = () => {
    if (!room.students.length) return setToast('Lớp chưa có học sinh để xuất')
    exportStudentsCsv(room); setShowExport(false); setToast('Đã xuất danh sách học sinh (CSV)')
  }
  const onCsv = async (file?: File) => { if (file) { setImportText(await file.text()); setImportErrors([]) } }
  const onAvatar = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setToast('Vui lòng chọn một file ảnh')
    if (file.size > 1_500_000) return setToast('Ảnh phải nhỏ hơn 1,5 MB')
    const reader = new FileReader(); reader.onload = () => setStudentDraft(draft => ({ ...draft, avatar: String(reader.result) })); reader.readAsDataURL(file)
  }
  const addStudent = () => {
    if (!studentDraft.name.trim()) return setToast('Vui lòng nhập họ tên học sinh')
    updateRoom({ students: [...room.students, { ...studentDraft, name: studentDraft.name.trim(), id: uid() }] })
    setStudentDraft({ name: '', gender: 'Khác', height: 160, weight: 50, performance: 7, priority: false, avatar: '', note: '' })
    setShowAddStudent(false); setToast('Đã thêm học sinh')
  }
  const openAddStudent = () => {
    setEditingStudentId(null)
    setStudentDraft({ name: '', gender: 'Khác', height: 160, weight: 50, performance: 7, priority: false, avatar: '', note: '' })
    setShowAddStudent(true)
  }
  const openEditStudent = (student: Student) => {
    setEditingStudentId(student.id)
    setStudentDraft({ name: student.name, gender: student.gender, height: student.height, weight: student.weight, performance: student.performance, priority: student.priority, avatar: student.avatar ?? '', note: student.note ?? '' })
    setShowAddStudent(true)
  }
  const saveStudent = () => {
    if (!studentDraft.name.trim()) return setToast('Vui lòng nhập họ tên học sinh')
    if (editingStudentId) {
      updateRoom({ students: room.students.map(student => student.id === editingStudentId ? { ...student, ...studentDraft, name: studentDraft.name.trim() } : student) })
      setToast('Đã cập nhật thông tin học sinh')
    } else addStudent()
    setShowAddStudent(false)
    setEditingStudentId(null)
  }
  const removeStudent = (studentId: string) => {
    const target = room.students.find(student => student.id === studentId)
    if (!target || !window.confirm(`Xóa học sinh “${target.name}”?`)) return
    const seatId = Object.keys(room.assignments).find(key => room.assignments[key] === studentId)
    const nextAssignments = { ...room.assignments }
    if (seatId) delete nextAssignments[seatId]
    updateRoom({ students: room.students.filter(student => student.id !== studentId), assignments: nextAssignments, lockedSeats: (room.lockedSeats ?? []).filter(id => id !== seatId) })
    if (selectedStudentId === studentId) setSelectedStudentId(null)
    setToast('Đã xóa học sinh')
  }

  return <div className={`app-shell ${tourStep !== null ? `tour-active tour-step-${tourStep}` : ''}`}>
    <header className="topbar">
      <button className="mobile-menu icon-button" aria-label="Mở menu" onClick={() => setMobileNav(true)}><Menu /></button>
      <div className="brand"><div className="brand-mark"><Armchair size={21} /></div><div><strong>Lớp Học 3D</strong><span>Không gian học tập thông minh</span></div></div>
       <button className="class-switcher" onClick={() => setPage('overview')}><div className="class-avatar">{room.name.replace('Lớp ', '').slice(0, 3)}</div><div><small>Đang làm việc tại</small><strong>{room.name}</strong></div><ChevronDown size={16} /></button>
      <div className="header-actions"><button className="ghost-button" onClick={() => setShowSetup(true)}><Settings2 size={17} /> Thiết lập lớp</button>
        <div className="export-wrap">
          <button className="primary-button" onClick={() => setShowExport(!showExport)}><Download size={17} /> Xuất sơ đồ <ChevronDown size={15} /></button>
          {showExport && <div className="export-menu">
            <button onClick={() => { exportPdf(room); setShowExport(false); setToast('Đã xuất PDF sơ đồ lớp') }}><FileDown size={15} /><span><strong>Xuất PDF</strong><small>Bản in giữ nguyên bố cục</small></span></button>
            <button onClick={() => { exportWord(room); setShowExport(false); setToast('Đã xuất file Word để chỉnh sửa') }}><FileText size={15} /><span><strong>Xuất Word (.doc)</strong><small>Dạng bảng, dễ chỉnh sửa</small></span></button>
            <button onClick={exportStudentList}><FileSpreadsheet size={15} /><span><strong>Xuất danh sách (.csv)</strong><small>{room.students.length} học sinh kèm bàn · ghế</small></span></button>
            <small className="export-hint">Cả hai bản sơ đồ đều có bàn giáo viên ở {(room.teacherDeskSide ?? 'right') === 'right' ? 'bên phải' : 'bên trái'} bảng.</small>
          </div>}
        </div>
      </div>
    </header>

    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <button className="close-mobile icon-button" onClick={() => setMobileNav(false)}><X /></button>
      <nav>
        <span className="nav-label">Không gian làm việc</span>
        <button className={`nav-item ${page === 'overview' ? 'active' : ''}`} onClick={() => navigate('overview')}><LayoutDashboard size={19} /> Tổng quan</button>
        <button className={`nav-item ${page === 'seating' ? 'active' : ''}`} onClick={() => navigate('seating')}><Armchair size={19} /> Sơ đồ chỗ ngồi <span>{Object.keys(room.assignments).length}</span></button>
        <button className={`nav-item ${page === 'students' ? 'active' : ''}`} onClick={() => navigate('students')}><Users size={19} /> Học sinh <span>{room.students.length}</span></button>
        <span className="nav-label second">Lớp học của tôi</span>
        <div className="tour-sample-list">{rooms.map((r, i) => <button key={r.id} className={`room-item ${r.id === room.id ? 'selected' : ''}`} onClick={() => selectRoom(r.id)}><i style={{ background: ['#d97b62','#738e8a','#d2a64e'][i % 3] }} /> <span><strong>{r.name}</strong><small>{r.teacher || 'Chưa có GVCN'}</small></span><em>{r.students.length}</em></button>)}</div>
        <button className="new-room" onClick={addRoom}><Plus size={16} /> Tạo lớp học mới</button>
      </nav>
      <div className="help-card"><div><CircleHelp size={19} /></div><strong>Cần trợ giúp?</strong><p>Xem hướng dẫn tạo sơ đồ lớp học hiệu quả.</p><button onClick={startTutorial}>Xem hướng dẫn tương tác</button></div>
      <button className="profile" onClick={() => setShowProfile(true)}><div className="profile-avatar">{initials(profile.name)}</div><span><strong>{profile.name}</strong><small>{profile.role}</small></span><span className="profile-setting"><Settings2 size={16}/></span></button>
    </aside>

    <main className="workspace">
      {page === 'overview' ? <OverviewPage rooms={rooms} room={room} onSelectRoom={id => { selectRoom(id); setPage('seating') }} onCreateRoom={addRoom} onDuplicate={duplicateRoom} onDelete={deleteRoom} onStudents={() => setPage('students')} /> : page === 'students' ? <StudentsPage room={room} query={query} setQuery={setQuery} onAdd={openAddStudent} onEdit={openEditStudent} onDelete={removeStudent} onImport={() => setShowImport(true)} onGoToSeats={() => setPage('seating')} onExportCsv={exportStudentList} onClearAll={clearAllStudents} onSample={() => appendStudents(createSampleStudents(), `Đã thêm ${demoStudents.length} học sinh mẫu`)} onRandom={() => appendStudents(generateRandomStudents(randomCount), `Đã thêm ${randomCount} học sinh ngẫu nhiên`)} randomCount={randomCount} /> : <>
      <div className="workspace-head">
        <div><div className="eyebrow">SƠ ĐỒ CHỖ NGỒI <span>/</span> {room.name.toUpperCase()}</div><h1>{room.name} — Học kỳ I</h1><p>Kéo để đổi chỗ; bật “Cố định chỗ” rồi chọn các ghế cần giữ nguyên khi sắp xếp.</p></div>
        <div className="status"><i /> Đã lưu <span>•</span> {new Date(room.updatedAt).toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      <div className="toolbar">
        <div className="segmented"><button className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')}><Box size={17}/> 3D</button><button className={view === '2d' ? 'active' : ''} onClick={() => setView('2d')}><Grid2X2 size={17}/> 2D</button></div>
        <div className="toolbar-spacer" />
        <button className={`tool-button lock-button ${lockMode ? 'active' : ''}`} onClick={() => { setLockMode(!lockMode); if (view !== '2d') setView('2d') }}>{lockMode ? <Lock size={16}/> : <LockOpen size={16}/>} {lockMode ? 'Đang chọn chỗ khóa' : `Cố định chỗ (${room.lockedSeats?.length ?? 0})`}</button>
         <button className="tool-button tour-arrange-button" onClick={() => setShowArrange(!showArrange)}><Sparkles size={17}/> Tự động sắp xếp <ChevronDown size={15}/></button>
        {showArrange && <div className="arrange-menu">
          <strong>Chọn tiêu chí</strong>
          <button onClick={() => runArrange('random', 'all')}><Shuffle size={15}/>Ngẫu nhiên toàn bộ</button>
          <button onClick={() => runArrange('random', 'lane')}><Shuffle size={15}/>Ngẫu nhiên theo từng dãy</button>
          <button onClick={() => runArrange('column')}><Shuffle size={15}/>Xáo theo hàng dọc ({genderRatio.male} nam : {genderRatio.female} nữ)</button>
          <div className="arrange-divider" />
          {([['name','Theo tên A–Z'],['performance','Xen kẽ học lực'],['gender','Xen kẽ giới tính'],['height','Thấp ngồi gần bảng']] as [ArrangeMode,string][]).map(([key, label]) => <button key={key} onClick={() => runArrange(key)}><Shuffle size={15}/>{label}</button>)}
          <div className="arrange-divider" />
          <strong className="with-icon"><Plane size={13}/> Hiệu ứng bay vào chỗ</strong>
          <div className="flight-options">{FLIGHT_BATCH_OPTIONS.map(option => <button key={option} className={flightBatch === option ? 'active' : ''} onClick={() => setFlightBatch(option)}>{option ? `${option} bạn` : 'Tắt'}</button>)}</div>
          <strong className="with-icon"><Rabbit size={13}/> Hiệu ứng nhảy chỗ</strong>
          <div className="flight-options">{([[true, 'Bật'], [false, 'Tắt']] as [boolean, string][]).map(([value, label]) => <button key={label} className={hopEffect === value ? 'active' : ''} onClick={() => { setHopEffect(value); if (!value) setHops({}) }}>{label}</button>)}</div>
          <small>Khi kéo thả hoặc đổi chỗ, học sinh sẽ nhảy sang vị trí mới. Các chỗ có biểu tượng khóa luôn được giữ nguyên.</small>
        </div>}
        <button className="icon-button bordered" title="Xóa các vị trí chưa khóa" onClick={clearUnlocked}><RotateCcw size={17}/></button>
      </div>

      <section className="content-grid">
         <div className="chart-card tour-seat-map">
          <div className={`board-label teacher-${room.teacherDeskSide ?? 'right'}`}><span>BẢNG</span><i className="teacher-desk-2d"><Armchair size={12}/> Bàn GV{room.teacher ? ` · ${room.teacher.split(' ').slice(-2).join(' ')}` : ''}</i></div>
          {view === '3d' ? <div className="scene"
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!sceneHandle.current || !dragStudent.current) return; const rect = e.currentTarget.getBoundingClientRect(); const hit = sceneHandle.current.seatAt(e.clientX - rect.left, e.clientY - rect.top); if (hit !== scene3dDropTarget) setScene3dDropTarget(hit) }}
            onDragLeave={e => { if (e.currentTarget.contains(e.relatedTarget as Node)) return; setScene3dDropTarget(null) }}
            onDrop={e => { e.preventDefault(); if (!dragStudent.current || !scene3dDropTarget) return; placeStudent(scene3dDropTarget, dragStudent.current); dragStudent.current = null; setScene3dDropTarget(null) }}>
            <ClassroomScene room={room} onSeatClick={cycleSeat} onSeatSwap={swapSeats} highlightSeatId={scene3dDropTarget} handleRef={sceneHandle} flights={flights} flightDuration={FLIGHT_DURATION} hops={hops} hopDuration={HOP_DURATION}/>
            <div className="scene-tip">Kéo để xoay • Cuộn để thu phóng</div>
          </div> :
          <div className={`floor-plan layout-${room.layout}`} style={{ gridTemplateColumns: `repeat(${room.columns}, minmax(110px, 1fr))` }}>
            {Array.from({ length: room.rows * room.columns }, (_, desk) => <div className="desk-2d" key={desk}><div className="desk-number">Bàn {desk + 1} · {getDeskSeatCount(room, desk)} ghế</div><div className="seats-row">{seats.filter(s => s.deskIndex === desk).map(seat => {
              const student = studentsById.get(room.assignments[seat.id]); const isLocked = (room.lockedSeats ?? []).includes(seat.id)
              const flightAt = flights[seat.id]; const flying = student && flightAt !== undefined
              const hopping = Boolean(student) && !flying && hops[seat.id] !== undefined
              return <div key={seat.id} className={`seat-2d ${student ? 'occupied' : ''} ${isLocked ? 'locked' : ''} ${lockMode ? 'lock-mode' : ''} ${dropTargetId === seat.id ? 'drop-target' : ''} ${student?.id === selectedStudentId ? 'selected-student' : ''} ${flying ? 'flying' : ''} ${hopping ? 'hopping' : ''}`} tabIndex={0}
                style={flying ? { animationDuration: `${FLIGHT_DURATION}ms`, animationDelay: `${Math.max(0, flightAt - Date.now())}ms` } : hopping ? { animationDuration: `${HOP_DURATION}ms` } : undefined}
                draggable={Boolean(student) && !isLocked && !lockMode}
                onDragStart={event => student && beginDrag(event, student.id)}
                onDragEnd={() => { dragStudent.current = null; setDropTargetId(null) }}
                onDragEnter={e => { e.preventDefault(); setDropTargetId(seat.id) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(null) }}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                onDrop={event => dropStudent(event, seat.id)}
                onClick={() => selectOrPlace(seat.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectOrPlace(seat.id) } }}>
                {isLocked && <div className="seat-lock" title="Vị trí cố định"><Lock size={11}/></div>}
                {student ? <><StudentAvatar student={student} mini/><span title={student.name}>{getDisplayName(student.name)}</span></> : <><Plus size={16}/><span>Ghế trống</span></>}
              </div>})}</div></div>)}
          </div>}
          <div className="legend"><span><i className="assigned-dot"/> Đã gán: {Object.keys(room.assignments).length}</span><span><i className="locked-dot"/> Cố định: {room.lockedSeats?.length ?? 0}</span><span><i className="empty-dot"/> Còn trống: {Math.max(0, seats.length - Object.keys(room.assignments).length)}</span><span className="capacity">Sức chứa <strong>{seats.length}</strong></span></div>
        </div>

        <aside className="student-panel tour-student-panel">
          <div className="panel-title"><div><h2>Danh sách học sinh</h2><p>{unassigned.length} học sinh chưa xếp · {room.students.length} học sinh</p></div><button className="icon-button" aria-label="Thêm học sinh" onClick={openAddStudent}><Plus/></button></div>
          <div className="search"><Search size={17}/><input aria-label="Tìm học sinh" placeholder="Tìm học sinh..." value={query} onChange={e => setQuery(e.target.value)}/></div>
          {selectedStudentId && <button className="selection-notice" onClick={() => setSelectedStudentId(null)}>Đang chọn học sinh — nhấp vào một ghế để đặt <X size={13}/></button>}
          <div className="student-list">{visibleStudents.map(student => { const isAssigned = assignedIds.has(student.id); return <div className={`student-card ${student.id === selectedStudentId ? 'selected' : ''} ${isAssigned ? 'is-assigned' : ''}`} key={student.id} draggable={!isAssigned}
            onDragStart={event => !isAssigned && beginDrag(event, student.id)}
            onDragEnd={() => { dragStudent.current = null; setDropTargetId(null) }}
            onClick={() => !isAssigned && setSelectedStudentId(current => current === student.id ? null : student.id)}>
            <StudentAvatar student={student}/><div className="student-card-content"><strong title={student.name}>{student.name}</strong><span>{student.gender} · {student.height}cm · {student.performance.toFixed(1)} điểm</span><div className="student-card-actions">{student.priority && <em>Ưu tiên</em>}<small className="assignment-state">{isAssigned ? 'Đã xếp chỗ' : 'Chưa xếp'}</small><button className="mini-action" title="Sửa thông tin" aria-label={`Sửa ${student.name}`} onClick={event => { event.stopPropagation(); openEditStudent(student) }}><Pencil size={13}/></button><button className="mini-action danger" title="Xóa học sinh" aria-label={`Xóa ${student.name}`} onClick={event => { event.stopPropagation(); removeStudent(student.id) }}><Trash2 size={13}/></button>{!isAssigned && <span className="drag-handle">⠿</span>}</div></div>
          </div>})}{!visibleStudents.length && <div className="empty-list"><Armchair/><strong>Không tìm thấy học sinh</strong><p>Hãy thử từ khóa khác.</p></div>}</div>
          <button className="import-button" onClick={() => setShowImport(true)}><FileUp size={17}/> Nhập danh sách học sinh</button>
          <div className="panel-quick-actions">
            <button title="Thêm nhanh danh sách mẫu" onClick={() => appendStudents(createSampleStudents(), `Đã thêm ${demoStudents.length} học sinh mẫu`)}><Wand2 size={14}/> Danh sách mẫu</button>
            <button title={`Tạo ${randomCount} học sinh ngẫu nhiên`} onClick={() => appendStudents(generateRandomStudents(randomCount), `Đã thêm ${randomCount} học sinh ngẫu nhiên`)}><Dices size={14}/> Ngẫu nhiên</button>
            <button title="Xuất danh sách ra CSV" onClick={exportStudentList}><FileSpreadsheet size={14}/> Xuất CSV</button>
            <button className="danger" title="Xóa toàn bộ học sinh trong lớp" onClick={clearAllStudents}><Eraser size={14}/> Xóa tất cả</button>
          </div>
        </aside>
      </section>
      </>}
    </main>

    {showSetup && <Modal title="Thiết lập lớp học" onClose={() => setShowSetup(false)}>
      <div className="form-grid"><label>Tên lớp<input value={room.name} onChange={e => updateRoom({ name: e.target.value })}/></label><label>Giáo viên chủ nhiệm<input value={room.teacher} onChange={e => updateRoom({ teacher: e.target.value })}/></label><label>Số hàng<input type="number" min="1" max="8" value={room.rows} onChange={e => updateRoom({ rows: Math.max(1, Number(e.target.value)), assignments: {}, lockedSeats: [] })}/></label><label>Số cột<input type="number" min="1" max="8" value={room.columns} onChange={e => updateRoom({ columns: Math.max(1, Number(e.target.value)), assignments: {}, lockedSeats: [] })}/></label><label>Số ghế / bàn (mặc định)<input type="number" min="1" max={MAX_SEATS_PER_DESK} value={room.seatsPerDesk} onChange={e => updateRoom({ seatsPerDesk: Math.min(MAX_SEATS_PER_DESK, Math.max(1, Number(e.target.value) || 1)), deskSeats: {}, assignments: {}, lockedSeats: [] })}/></label><label>Kiểu bố cục<select value={room.layout} onChange={e => updateRoom({ layout: e.target.value as LayoutStyle, assignments: {}, lockedSeats: [] })}><option value="grid">Dạng lưới</option><option value="u-shape">Chữ U</option><option value="pairs">Nhóm đôi</option></select></label><label>Bàn giáo viên<select value={room.teacherDeskSide ?? 'right'} onChange={e => updateRoom({ teacherDeskSide: e.target.value as 'left' | 'right' })}><option value="right">Bên phải bảng</option><option value="left">Bên trái bảng</option></select></label><label>Tỉ lệ nam : nữ mỗi hàng dọc<span className="ratio-input"><input type="number" min="0" max="20" value={genderRatio.male} onChange={e => updateRoom({ columnGenderRatio: { ...genderRatio, male: Math.max(0, Number(e.target.value) || 0) } })}/><em>nam :</em><input type="number" min="0" max="20" value={genderRatio.female} onChange={e => updateRoom({ columnGenderRatio: { ...genderRatio, female: Math.max(0, Number(e.target.value) || 0) } })}/><em>nữ</em></span></label></div>
      <p className="modal-help">Số ghế mỗi bàn có thể khác nhau — chỉnh riêng từng bàn bên dưới. Tỉ lệ {DEFAULT_COLUMN_GENDER_RATIO.male}:{DEFAULT_COLUMN_GENDER_RATIO.female} là mặc định cho chế độ “Xáo theo hàng dọc”.</p>
      <div className="desk-seat-grid">{Array.from({ length: room.rows * room.columns }, (_, desk) => <label key={desk}><span>Bàn {desk + 1}</span><input type="number" min="1" max={MAX_SEATS_PER_DESK} value={getDeskSeatCount(room, desk)} onChange={e => {
        const value = Math.min(MAX_SEATS_PER_DESK, Math.max(1, Number(e.target.value) || 1))
        const nextDeskSeats = { ...(room.deskSeats ?? {}), [String(desk)]: value }
        const removed = new Set(seats.filter(seat => seat.deskIndex === desk && seat.seatIndex >= value).map(seat => seat.id))
        updateRoom({
          deskSeats: nextDeskSeats,
          assignments: Object.fromEntries(Object.entries(room.assignments).filter(([seatId]) => !removed.has(seatId))),
          lockedSeats: (room.lockedSeats ?? []).filter(seatId => !removed.has(seatId)),
        })
      }}/></label>)}</div>
      <div className="setup-list-actions">
        <strong>Danh sách học sinh ({room.students.length})</strong>
        <div>
          <button className="file-button" onClick={() => appendStudents(createSampleStudents(), `Đã nạp ${demoStudents.length} học sinh mẫu`)}><Wand2 size={15}/> Nạp danh sách mẫu</button>
          <button className="file-button" onClick={() => appendStudents(generateRandomStudents(randomCount), `Đã tạo ${randomCount} học sinh ngẫu nhiên`)}><Dices size={15}/> Tạo {randomCount} HS ngẫu nhiên</button>
          <button className="file-button" onClick={exportStudentList}><FileSpreadsheet size={15}/> Xuất CSV</button>
          <button className="file-button danger" onClick={clearAllStudents}><Eraser size={15}/> Xóa toàn bộ</button>
        </div>
      </div>
      <button className="primary-button full" onClick={() => setShowSetup(false)}>Hoàn tất thiết lập</button>
    </Modal>}
    {showNewRoom && <Modal title="Tạo lớp học mới" onClose={() => setShowNewRoom(false)}>
      <div className="form-grid"><label className="wide-label">Tên lớp<input autoFocus value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="Ví dụ: Lớp 10A2"/></label></div>
      <p className="modal-help">Chọn cách khởi tạo danh sách học sinh. Bạn luôn có thể nhập thêm hoặc xóa toàn bộ về sau.</p>
      <div className="source-options">
        {([
          ['empty', 'Danh sách trống', 'Tự thêm từng học sinh hoặc nhập CSV sau.'],
          ['sample', `Danh sách mẫu (${demoStudents.length} HS)`, 'Hồ sơ mẫu có sẵn ghi chú, ưu tiên để thử nghiệm ngay.'],
          ['random', 'Học sinh ngẫu nhiên', 'Sinh tên, giới tính, thể chất và học lực ngẫu nhiên.'],
        ] as [NewRoomSource, string, string][]).map(([key, label, description]) => <button key={key} className={`source-option ${newRoomSource === key ? 'active' : ''}`} onClick={() => setNewRoomSource(key)}>
          <span className="source-icon">{key === 'empty' ? <Users size={16}/> : key === 'sample' ? <Wand2 size={16}/> : <Dices size={16}/>}</span>
          <span><strong>{label}</strong><small>{description}</small></span>
        </button>)}
      </div>
      {newRoomSource === 'random' && <label className="wide-label">Số học sinh ngẫu nhiên
        <select value={randomCount} onChange={e => setRandomCount(Number(e.target.value))}>{RANDOM_STUDENT_COUNT_OPTIONS.map(option => <option key={option} value={option}>{option} học sinh</option>)}</select>
      </label>}
      <button className="primary-button full" onClick={confirmAddRoom}><Plus size={16}/> Tạo lớp học</button>
    </Modal>}
    {showImport && <Modal title="Nhập danh sách học sinh" onClose={() => setShowImport(false)}>
      <p className="modal-help">Dùng đúng các cột: <strong>Họ tên, Giới tính, Chiều cao, Cân nặng, Điểm, Ưu tiên, Ghi chú, Avatar</strong>. Avatar có thể là URL ảnh; cột ưu tiên nhập “x” hoặc để trống.</p>
      <div className="template-buttons"><button className="file-button" onClick={() => downloadStudentTemplate('csv')}><FileDown size={16}/> Tải CSV mẫu</button><button className="file-button" onClick={() => downloadStudentTemplate('txt')}><FileDown size={16}/> Tải TXT mẫu</button></div>
      <div className="sample-box">
        <div className="sample-box-head"><Wand2 size={15}/><div><strong>Nhập mẫu nhanh</strong><small>Điền sẵn dữ liệu vào ô bên dưới để bạn xem trước và chỉnh sửa.</small></div></div>
        <div className="sample-box-actions">
          <button className="file-button" onClick={fillSampleList}><Wand2 size={15}/> Danh sách mẫu ({demoStudents.length} HS)</button>
          <span className="sample-random"><Dices size={15}/> Ngẫu nhiên
            <select aria-label="Số học sinh ngẫu nhiên" value={randomCount} onChange={e => setRandomCount(Number(e.target.value))}>{RANDOM_STUDENT_COUNT_OPTIONS.map(option => <option key={option} value={option}>{option} HS</option>)}</select>
            <button className="file-button" onClick={() => fillRandomList(randomCount)}>Tạo</button>
          </span>
        </div>
      </div>
      <textarea rows={8} value={importText} onChange={e => { setImportText(e.target.value); setImportErrors([]) }} placeholder={'Họ tên,Giới tính,Chiều cao,Cân nặng,Điểm,Ưu tiên,Ghi chú,Avatar\nNguyễn Văn An,Nam,165,54,8.2,x,Cần ngồi gần bảng,'}/>
      {importErrors.length > 0 && <div className="import-errors"><strong>Vui lòng sửa dữ liệu:</strong>{importErrors.slice(0, 6).map(error => <span key={error}>• {error}</span>)}{importErrors.length > 6 && <span>… và {importErrors.length - 6} lỗi khác</span>}</div>}
      <div className="modal-actions"><label className="file-button"><FileUp size={16}/> Chọn CSV / TXT<input hidden type="file" accept=".csv,.txt,text/csv,text/plain" onChange={e => onCsv(e.target.files?.[0])}/></label><button className="primary-button" onClick={importList}>Kiểm tra và thêm</button></div>
    </Modal>}
    {showAddStudent && <Modal title={editingStudentId ? 'Chỉnh sửa học sinh' : 'Thêm học sinh'} onClose={() => { setShowAddStudent(false); setEditingStudentId(null) }}>
      <div className="student-form">
        <div className="avatar-picker"><StudentAvatar student={{ ...studentDraft, id: 'preview', name: studentDraft.name || '?' } as Student}/><div><label className="file-button"><ImagePlus size={16}/> Chọn ảnh<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => onAvatar(e.target.files?.[0])}/></label><small>PNG, JPG hoặc WebP, tối đa 1,5 MB</small></div></div>
        <div className="form-grid"><label>Họ và tên *<input autoFocus value={studentDraft.name} onChange={e => setStudentDraft({ ...studentDraft, name: e.target.value })}/></label><label>Giới tính<select value={studentDraft.gender} onChange={e => setStudentDraft({ ...studentDraft, gender: e.target.value as Student['gender'] })}><option>Nam</option><option>Nữ</option><option>Khác</option></select></label><label>Chiều cao (cm)<input type="number" min="80" max="250" value={studentDraft.height} onChange={e => setStudentDraft({ ...studentDraft, height: Number(e.target.value) })}/></label><label>Cân nặng (kg)<input type="number" min="15" max="250" value={studentDraft.weight} onChange={e => setStudentDraft({ ...studentDraft, weight: Number(e.target.value) })}/></label><label>Điểm / học lực<input type="number" min="0" max="10" step="0.1" value={studentDraft.performance} onChange={e => setStudentDraft({ ...studentDraft, performance: Number(e.target.value) })}/></label><label>URL avatar (tùy chọn)<input value={studentDraft.avatar} onChange={e => setStudentDraft({ ...studentDraft, avatar: e.target.value })} placeholder="https://..."/></label></div>
        <label className="wide-label">Ghi chú<textarea rows={3} value={studentDraft.note} onChange={e => setStudentDraft({ ...studentDraft, note: e.target.value })}/></label><label className="check-label"><input type="checkbox" checked={studentDraft.priority} onChange={e => setStudentDraft({ ...studentDraft, priority: e.target.checked })}/> Ưu tiên xếp gần bảng</label>
      </div><button className="primary-button full" onClick={saveStudent}>{editingStudentId ? 'Lưu thay đổi' : 'Thêm học sinh'}</button>
    </Modal>}
    {showHelp && <Modal title="Hướng dẫn sử dụng" onClose={() => setShowHelp(false)}>
      <div className="guide-list">
        <GuideStep number="1" title="Tạo và thiết lập lớp" text="Chọn “Tạo lớp học mới”, đặt tên và chọn danh sách trống, danh sách mẫu hoặc học sinh ngẫu nhiên. Sau đó nhập số hàng, cột, kiểu bố cục, vị trí bàn giáo viên và số ghế cho từng bàn." />
        <GuideStep number="2" title="Thêm danh sách học sinh" text="Thêm từng học sinh, nhập nhanh CSV/TXT, dùng “Danh sách mẫu” hoặc “Ngẫu nhiên” để tạo dữ liệu thử. Có thể xuất danh sách ra CSV hoặc xóa toàn bộ để làm lại." />
        <GuideStep number="3" title="Xếp chỗ" text="Ở chế độ 2D, kéo thẻ học sinh vào ghế hoặc nhấp học sinh rồi nhấp ghế. Dùng tự động sắp xếp để tạo phương án nhanh." />
        <GuideStep number="4" title="Cố định và xuất bản" text="Khóa các vị trí cần giữ nguyên trước khi xáo trộn, sau đó xuất PDF để in, xuất Word (.doc) nếu cần chỉnh sửa hoặc xuất danh sách học sinh ra CSV." />
      </div>
      <button className="primary-button full" onClick={startTutorial}>Bắt đầu tour tương tác</button>
    </Modal>}
    {showProfile && <Modal title="Hồ sơ giáo viên" onClose={() => setShowProfile(false)}>
      <div className="profile-form-head"><div className="profile-avatar large">{initials(profile.name)}</div><div><strong>{profile.name || 'Giáo viên'}</strong><small>Dữ liệu được lưu trên trình duyệt này</small></div></div>
      <div className="form-grid"><label>Họ và tên<input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}/></label><label>Vai trò<input value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })}/></label><label>Email<input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })}/></label><label>Trường / đơn vị<input value={profile.school} onChange={e => setProfile({ ...profile, school: e.target.value })}/></label></div>
      <button className="primary-button full" onClick={() => { setShowProfile(false); setToast('Đã lưu hồ sơ giáo viên') }}>Lưu hồ sơ</button>
    </Modal>}
    {toast && <div className="toast">✓ {toast}</div>}
    {tourStep !== null && <TutorialTour step={tourStep} onNext={() => setTourStep(current => current === 3 ? null : (current ?? 0) + 1)} onBack={() => setTourStep(current => Math.max(0, (current ?? 0) - 1))} onClose={finishTutorial} />}
    {mobileNav && <div className="scrim" onClick={() => setMobileNav(false)}/>} 
  </div>
}

function OverviewPage({ rooms, room, onSelectRoom, onCreateRoom, onDuplicate, onDelete, onStudents }: {
  rooms: Classroom[]; room: Classroom; onSelectRoom: (id: string) => void; onCreateRoom: () => void; onDuplicate: (room: Classroom) => void; onDelete: (id: string) => void; onStudents: () => void
}) {
  const totalStudents = rooms.reduce((sum, item) => sum + item.students.length, 0)
  const assigned = Object.keys(room.assignments).length
  const capacity = getSeats(room).length
  const completion = room.students.length ? Math.round((assigned / room.students.length) * 100) : 0
  return <section className="overview-page">
    <div className="page-hero"><div><div className="eyebrow">TỔNG QUAN KHÔNG GIAN</div><h1>Chào mừng trở lại</h1><p>Quản lý lớp học, học sinh và các sơ đồ chỗ ngồi của bạn tại một nơi.</p></div><button className="primary-button" onClick={onCreateRoom}><Plus size={17}/> Tạo lớp học mới</button></div>
    <div className="stats-grid">
      <div className="stat-card"><span className="stat-icon green"><BookOpen/></span><div><small>Lớp học</small><strong>{rooms.length}</strong><em>Đang được lưu</em></div></div>
      <div className="stat-card"><span className="stat-icon orange"><Users/></span><div><small>Tổng học sinh</small><strong>{totalStudents}</strong><em>Trong tất cả lớp</em></div></div>
      <div className="stat-card"><span className="stat-icon blue"><Armchair/></span><div><small>Đã xếp chỗ</small><strong>{assigned}/{room.students.length}</strong><em>{room.name}</em></div></div>
      <div className="stat-card"><span className="stat-icon gold"><BarChart3/></span><div><small>Hoàn thành</small><strong>{completion}%</strong><em>{capacity} chỗ tối đa</em></div></div>
    </div>
    <div className="overview-layout">
      <div className="overview-card class-library"><div className="section-head"><div><h2>Lớp học của tôi</h2><p>Mở, nhân bản hoặc quản lý các lớp đã lưu.</p></div><button className="ghost-button" onClick={onCreateRoom}><Plus size={15}/> Thêm lớp</button></div>
        <div className="class-card-grid">{rooms.map((item, index) => {
          const seats = getSeats(item).length; const placed = Object.keys(item.assignments).length; const percent = item.students.length ? Math.round(placed / item.students.length * 100) : 0
          return <article className={`class-card ${item.id === room.id ? 'current' : ''}`} key={item.id}>
            <div className="class-card-top"><span className="class-dot" style={{ background: ['#d97b62','#5f8d83','#d2a64e'][index % 3] }}/><span>{item.id === room.id ? 'Đang chọn' : 'Đã lưu'}</span><div className="class-actions"><button title="Nhân bản lớp" onClick={() => onDuplicate(item)}><Copy size={14}/></button><button title="Xóa lớp" className="danger" onClick={() => onDelete(item.id)}><Trash2 size={14}/></button></div></div>
            <button className="class-card-main" onClick={() => onSelectRoom(item.id)}><strong>{item.name}</strong><small>{item.teacher || 'Chưa có giáo viên chủ nhiệm'}</small><div className="class-meta"><span><Users size={13}/>{item.students.length} học sinh</span><span><Armchair size={13}/>{seats} chỗ</span></div><div className="progress-track"><i style={{ width: `${Math.min(100, percent)}%` }}/></div><em>{placed}/{item.students.length} học sinh đã xếp</em></button>
          </article>
        })}</div>
      </div>
      <aside className="overview-side">
        <div className="overview-card quick-card"><h2>Thao tác nhanh</h2><button onClick={() => onSelectRoom(room.id)}><span><Armchair/></span><div><strong>Mở sơ đồ chỗ ngồi</strong><small>Tiếp tục sắp xếp {room.name}</small></div></button><button onClick={onStudents}><span><UserRound/></span><div><strong>Quản lý học sinh</strong><small>Thêm, sửa hoặc nhập danh sách</small></div></button></div>
        <div className="overview-card progress-card"><span className="progress-ring" style={{ '--progress': `${completion * 3.6}deg` } as React.CSSProperties}><b>{completion}%</b></span><div><h2>Tiến độ {room.name}</h2><p>{assigned === room.students.length && room.students.length ? 'Tất cả học sinh đã có chỗ ngồi.' : `Còn ${Math.max(0, room.students.length - assigned)} học sinh cần xếp chỗ.`}</p></div></div>
      </aside>
    </div>
  </section>
}

function StudentsPage({ room, query, setQuery, onAdd, onEdit, onDelete, onImport, onGoToSeats, onExportCsv, onClearAll, onSample, onRandom, randomCount }: {
  room: Classroom; query: string; setQuery: (value: string) => void; onAdd: () => void; onEdit: (student: Student) => void; onDelete: (id: string) => void; onImport: () => void; onGoToSeats: () => void
  onExportCsv: () => void; onClearAll: () => void; onSample: () => void; onRandom: () => void; randomCount: number
}) {
  const [status, setStatus] = useState<'all' | 'assigned' | 'waiting'>('all')
  const [sort, setSort] = useState<'name' | 'performance' | 'height'>('name')
  const assignedIds = new Set(Object.values(room.assignments))
  const seatByStudent = new Map(Object.entries(room.assignments).map(([seatId, studentId]) => [studentId, seatId]))
  const students = room.students.filter(student => {
    const matchesText = `${student.name} ${student.note ?? ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesText && (status === 'all' || (status === 'assigned' ? assignedIds.has(student.id) : !assignedIds.has(student.id)))
  }).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'vi') : sort === 'height' ? a.height - b.height : b.performance - a.performance)
  const average = room.students.length ? room.students.reduce((sum, student) => sum + student.performance, 0) / room.students.length : 0
  return <section className="students-page">
    <div className="page-hero"><div><div className="eyebrow">HỌC SINH <span>/</span> {room.name.toUpperCase()}</div><h1>Danh sách học sinh</h1><p>Quản lý hồ sơ và theo dõi trạng thái xếp chỗ của từng học sinh.</p></div><div className="page-actions"><button className="ghost-button" onClick={onSample} title="Thêm danh sách mẫu"><Wand2 size={16}/> Danh sách mẫu</button><button className="ghost-button" onClick={onRandom} title={`Tạo ${randomCount} học sinh ngẫu nhiên`}><Dices size={16}/> Ngẫu nhiên</button><button className="ghost-button" onClick={onExportCsv} title="Xuất danh sách ra CSV"><FileSpreadsheet size={16}/> Xuất CSV</button><button className="ghost-button danger" onClick={onClearAll} title="Xóa toàn bộ học sinh"><Eraser size={16}/> Xóa tất cả</button><button className="ghost-button" onClick={onImport}><FileUp size={16}/> Nhập danh sách</button><button className="primary-button" onClick={onAdd}><Plus size={17}/> Thêm học sinh</button></div></div>
    <div className="student-summary">
      <div><Users/><span><small>Tổng học sinh</small><strong>{room.students.length}</strong></span></div><div><CheckCircle2/><span><small>Đã xếp chỗ</small><strong>{assignedIds.size}</strong></span></div><div><Armchair/><span><small>Chưa xếp</small><strong>{Math.max(0, room.students.length - assignedIds.size)}</strong></span></div><div><BarChart3/><span><small>Điểm trung bình</small><strong>{average.toFixed(1)}</strong></span></div>
    </div>
    <div className="students-table-card">
      <div className="table-tools"><div className="search table-search"><Search size={17}/><input aria-label="Tìm trong danh sách" placeholder="Tìm theo tên hoặc ghi chú..." value={query} onChange={e => setQuery(e.target.value)}/></div><div className="filter-tabs"><button className={status === 'all' ? 'active' : ''} onClick={() => setStatus('all')}>Tất cả</button><button className={status === 'assigned' ? 'active' : ''} onClick={() => setStatus('assigned')}>Đã xếp</button><button className={status === 'waiting' ? 'active' : ''} onClick={() => setStatus('waiting')}>Chưa xếp</button></div><select aria-label="Sắp xếp học sinh" value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="name">Tên A–Z</option><option value="performance">Điểm cao trước</option><option value="height">Chiều cao tăng dần</option></select></div>
      <div className="table-scroll"><table><thead><tr><th>Học sinh</th><th>Giới tính</th><th>Thể chất</th><th>Học lực</th><th>Ghi chú</th><th>Chỗ ngồi</th><th aria-label="Thao tác"/></tr></thead><tbody>{students.map(student => {
        const seatId = seatByStudent.get(student.id); const [deskIndex, seatIndex] = seatId?.split('-').map(Number) ?? []
        return <tr key={student.id}><td><div className="student-cell"><StudentAvatar student={student}/><span><strong>{student.name}</strong><small>{student.priority ? '★ Ưu tiên gần bảng' : 'Hồ sơ tiêu chuẩn'}</small></span></div></td><td>{student.gender}</td><td><strong>{student.height} cm</strong><small>{student.weight} kg</small></td><td><span className={`score-badge ${student.performance >= 8 ? 'high' : student.performance < 6.5 ? 'low' : ''}`}>{student.performance.toFixed(1)}</span></td><td><span className="note-cell">{student.note || '—'}</span></td><td>{seatId ? <button className="seat-status assigned" onClick={onGoToSeats}>Bàn {deskIndex + 1} · Ghế {seatIndex + 1}</button> : <button className="seat-status" onClick={onGoToSeats}>Chưa xếp</button>}</td><td><div className="row-actions"><button title="Sửa" onClick={() => onEdit(student)}><Pencil size={15}/></button><button className="danger" title="Xóa" onClick={() => onDelete(student.id)}><Trash2 size={15}/></button></div></td></tr>
      })}</tbody></table>{!students.length && <div className="empty-table"><UserRound/><strong>Không có học sinh phù hợp</strong><p>Thử thay đổi từ khóa hoặc bộ lọc hiện tại.</p></div>}</div>
    </div>
  </section>
}

function GuideStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="guide-step"><span>{number}</span><div><strong>{title}</strong><p>{text}</p></div></div>
}

const tutorialSteps = [
  {
    eyebrow: 'BƯỚC 1 · DỮ LIỆU MẪU',
    title: 'Bắt đầu với lớp học mẫu',
    text: 'Danh sách bên trái có sẵn một lớp mẫu cùng hồ sơ học sinh để bạn khám phá ngay. Chọn tên lớp để chuyển nhanh giữa các lớp đã lưu.',
    hint: 'Bạn có thể tạo thêm lớp mới ở ngay bên dưới danh sách.',
  },
  {
    eyebrow: 'BƯỚC 2 · HỌC SINH',
    title: 'Thêm, sửa hoặc xóa học sinh',
    text: 'Nhấn dấu + để thêm hồ sơ mới. Trên mỗi thẻ, dùng biểu tượng bút chì để sửa và thùng rác để xóa học sinh khỏi lớp.',
    hint: 'Nút “Nhập danh sách học sinh” hỗ trợ thêm nhiều bạn từ CSV hoặc TXT.',
  },
  {
    eyebrow: 'BƯỚC 3 · KÉO THẢ',
    title: 'Đưa học sinh vào đúng vị trí',
    text: 'Kéo một thẻ “Chưa xếp” từ danh sách sang ghế muốn đặt. Bạn cũng có thể nhấp vào thẻ học sinh, sau đó nhấp vào ghế — cách này tiện hơn trên điện thoại.',
    hint: 'Kéo một học sinh đã có chỗ sang ghế khác để đổi vị trí — các bạn sẽ nhảy sang chỗ mới. Tắt/bật hiệu ứng trong menu “Tự động sắp xếp”.',
  },
  {
    eyebrow: 'BƯỚC 4 · SẮP XẾP',
    title: 'Chọn cách sắp xếp tự động',
    text: 'Mở “Tự động sắp xếp” rồi chọn ngẫu nhiên, theo hàng dọc, theo tên, học lực, giới tính hoặc chiều cao. Các ghế đã khóa sẽ luôn được giữ nguyên.',
    hint: 'Chọn số bạn cùng bay mỗi lượt để xem hiệu ứng xếp chỗ sinh động.',
  },
]

function TutorialTour({ step, onNext, onBack, onClose }: { step: number; onNext: () => void; onBack: () => void; onClose: () => void }) {
  const item = tutorialSteps[step]
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') onNext()
      if (event.key === 'ArrowLeft' && step > 0) onBack()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [step, onNext, onBack, onClose])
  return createPortal(<div className="tutorial-layer" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
    <div className="tutorial-dim" />
    <section className={`tutorial-card position-${step}`}>
      <button className="tutorial-close" onClick={onClose} aria-label="Đóng hướng dẫn"><X size={18}/></button>
      <div className="tutorial-eyebrow">{item.eyebrow}</div>
      <h2 id="tutorial-title">{item.title}</h2>
      <p>{item.text}</p>
      <div className="tutorial-hint"><CircleHelp size={15}/><span>{item.hint}</span></div>
      <div className="tutorial-footer">
        <div className="tutorial-dots" aria-label={`Bước ${step + 1} trên ${tutorialSteps.length}`}>{tutorialSteps.map((_, index) => <i key={index} className={index === step ? 'active' : ''} />)}</div>
        <div className="tutorial-actions">{step > 0 && <button className="tutorial-back" onClick={onBack}>Quay lại</button>}<button className="tutorial-next" onClick={onNext}>{step === tutorialSteps.length - 1 ? 'Hoàn tất' : 'Tiếp theo'}</button></div>
      </div>
      <button className="tutorial-skip" onClick={onClose}>Bỏ qua hướng dẫn</button>
    </section>
  </div>, document.body)
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map(part => part[0]?.toUpperCase()).join('') || 'GV'
}

function Modal({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose}><X/></button></div>{children}</div></div>
}

function StudentAvatar({ student, mini = false }: { student: Student, mini?: boolean }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [student.avatar])
  const letter = student.name.trim().split(' ').pop()?.[0]?.toUpperCase() || '?'
  return <div className={`${mini ? 'mini-avatar' : 'student-avatar'} ${student.gender === 'Nữ' ? 'female' : ''}`}>{student.avatar && !failed ? <img src={student.avatar} alt={`Ảnh ${student.name}`} onError={() => setFailed(true)}/> : letter}</div>
}

export default App