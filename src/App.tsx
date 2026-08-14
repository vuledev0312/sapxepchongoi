import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Armchair, BarChart3, BookOpen, Box, CheckCircle2, ChevronDown, CircleHelp, Copy, Download, FileDown, FileUp, Grid2X2, ImagePlus, LayoutDashboard, Lock, LockOpen, Menu, Pencil, Plus, RotateCcw, Search, Settings2, Shuffle, Sparkles, Trash2, UserRound, Users, X } from 'lucide-react'
import ClassroomScene from './ClassroomScene'
import { arrange, createClassroom, demoStudents, downloadStudentTemplate, exportPdf, getSeats, legacyDemoStudentNames, parseStudents, uid } from './lib'
import type { ArrangeMode, Classroom, LayoutStyle, Student, ViewMode } from './types'

const STORAGE_KEY = 'classroom-3d-data-v1'
const PROFILE_KEY = 'classroom-3d-profile-v1'
type WorkspacePage = 'overview' | 'seating' | 'students'
interface TeacherProfile { name: string; role: string; email: string; school: string }

function App() {
  const [rooms, setRooms] = useState<Classroom[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const storedRooms = JSON.parse(saved) as Classroom[]
        return storedRooms.map(storedRoom => {
          const isLegacyDemo = storedRoom.students.length === legacyDemoStudentNames.length
            && legacyDemoStudentNames.every(name => storedRoom.students.some(student => student.name === name))
          if (!isLegacyDemo) return storedRoom
          const additionalStudents = demoStudents.slice(legacyDemoStudentNames.length).map(student => ({ ...student, id: uid() }))
          return { ...storedRoom, students: [...storedRoom.students, ...additionalStudents] }
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
  const [profile, setProfile] = useState<TeacherProfile>(() => {
    try { const saved = localStorage.getItem(PROFILE_KEY); if (saved) return JSON.parse(saved) } catch { /* use defaults */ }
    return { name: 'Mai Thu', role: 'Giáo viên', email: 'maithu@school.edu.vn', school: 'Trường THPT Nguyễn Du' }
  })
  const dragStudent = useRef<string | null>(null)
  const room = rooms.find(r => r.id === activeId) ?? rooms[0]
  const seats = useMemo(() => getSeats(room), [room])
  const studentsById = useMemo(() => new Map(room.students.map(s => [s.id, s])), [room.students])
  const assignedIds = new Set(Object.values(room.assignments))
  const unassigned = room.students.filter(s => !assignedIds.has(s.id) && s.name.toLowerCase().includes(query.toLowerCase()))
  const visibleStudents = room.students.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms)), [rooms])
  useEffect(() => localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)), [profile])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t) }, [toast])

  const updateRoom = (patch: Partial<Classroom>) => setRooms(list => list.map(r => r.id === room.id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r))
  const addRoom = () => { const next = createClassroom(`Lớp mới ${rooms.length + 1}`); next.students = []; setRooms([...rooms, next]); setActiveId(next.id); setPage('seating'); setShowSetup(true); setMobileNav(false) }
  const selectRoom = (id: string) => { setActiveId(id); setSelectedStudentId(null); setQuery(''); setMobileNav(false) }
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
  const navigate = (nextPage: WorkspacePage) => { setPage(nextPage); setMobileNav(false) }
  const startTutorial = () => {
    setShowHelp(false)
    setPage('seating')
    setView('2d')
    setShowArrange(false)
    setTourStep(0)
  }
  const finishTutorial = () => setTourStep(null)
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
  const runArrange = (mode: ArrangeMode, scope: 'all' | 'lane' = 'all') => {
    updateRoom({ assignments: arrange(room, mode, scope) })
    setShowArrange(false)
    setToast(scope === 'lane' ? 'Đã xáo trộn trong từng dãy, giữ nguyên các chỗ khóa' : 'Đã sắp xếp toàn lớp, giữ nguyên các chỗ khóa')
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
      <div className="header-actions"><button className="ghost-button" onClick={() => setShowSetup(true)}><Settings2 size={17} /> Thiết lập lớp</button><button className="primary-button" onClick={() => exportPdf(room)}><Download size={17} /> Xuất PDF</button></div>
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
      {page === 'overview' ? <OverviewPage rooms={rooms} room={room} onSelectRoom={id => { selectRoom(id); setPage('seating') }} onCreateRoom={addRoom} onDuplicate={duplicateRoom} onDelete={deleteRoom} onStudents={() => setPage('students')} /> : page === 'students' ? <StudentsPage room={room} query={query} setQuery={setQuery} onAdd={openAddStudent} onEdit={openEditStudent} onDelete={removeStudent} onImport={() => setShowImport(true)} onGoToSeats={() => setPage('seating')} /> : <>
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
          <div className="arrange-divider" />
          {([['name','Theo tên A–Z'],['performance','Xen kẽ học lực'],['gender','Xen kẽ giới tính'],['height','Thấp ngồi gần bảng']] as [ArrangeMode,string][]).map(([key, label]) => <button key={key} onClick={() => runArrange(key)}><Shuffle size={15}/>{label}</button>)}
          <small>Các chỗ có biểu tượng khóa luôn được giữ nguyên.</small>
        </div>}
        <button className="icon-button bordered" title="Xóa các vị trí chưa khóa" onClick={clearUnlocked}><RotateCcw size={17}/></button>
      </div>

      <section className="content-grid">
         <div className="chart-card tour-seat-map">
          <div className="board-label"><span>BẢNG</span></div>
          {view === '3d' ? <div className="scene"><ClassroomScene room={room} onSeatClick={cycleSeat}/><div className="scene-tip">Kéo để xoay • Cuộn để thu phóng</div></div> :
          <div className={`floor-plan layout-${room.layout}`} style={{ gridTemplateColumns: `repeat(${room.columns}, minmax(110px, 1fr))` }}>
            {Array.from({ length: room.rows * room.columns }, (_, desk) => <div className="desk-2d" key={desk}><div className="desk-number">Bàn {desk + 1}</div><div className="seats-row">{seats.filter(s => s.deskIndex === desk).map(seat => {
              const student = studentsById.get(room.assignments[seat.id]); const isLocked = (room.lockedSeats ?? []).includes(seat.id); return <div key={seat.id} className={`seat-2d ${student ? 'occupied' : ''} ${isLocked ? 'locked' : ''} ${lockMode ? 'lock-mode' : ''} ${dropTargetId === seat.id ? 'drop-target' : ''} ${student?.id === selectedStudentId ? 'selected-student' : ''}`} tabIndex={0}
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
                {student ? <><StudentAvatar student={student} mini/><span>{student.name.split(' ').slice(-2).join(' ')}</span><small>{student.performance.toFixed(1)} điểm</small></> : <><Plus size={16}/><span>Ghế trống</span></>}
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
        </aside>
      </section>
      </>}
    </main>

    {showSetup && <Modal title="Thiết lập lớp học" onClose={() => setShowSetup(false)}>
      <div className="form-grid"><label>Tên lớp<input value={room.name} onChange={e => updateRoom({ name: e.target.value })}/></label><label>Giáo viên chủ nhiệm<input value={room.teacher} onChange={e => updateRoom({ teacher: e.target.value })}/></label><label>Số hàng<input type="number" min="1" max="8" value={room.rows} onChange={e => updateRoom({ rows: Math.max(1, Number(e.target.value)), assignments: {}, lockedSeats: [] })}/></label><label>Số cột<input type="number" min="1" max="8" value={room.columns} onChange={e => updateRoom({ columns: Math.max(1, Number(e.target.value)), assignments: {}, lockedSeats: [] })}/></label><label>Số ghế / bàn<select value={room.seatsPerDesk} onChange={e => updateRoom({ seatsPerDesk: Number(e.target.value), assignments: {}, lockedSeats: [] })}><option value="1">1 ghế</option><option value="2">2 ghế</option><option value="4">4 ghế</option></select></label><label>Kiểu bố cục<select value={room.layout} onChange={e => updateRoom({ layout: e.target.value as LayoutStyle, assignments: {}, lockedSeats: [] })}><option value="grid">Dạng lưới</option><option value="u-shape">Chữ U</option><option value="pairs">Nhóm đôi</option></select></label></div><button className="primary-button full" onClick={() => setShowSetup(false)}>Hoàn tất thiết lập</button>
    </Modal>}
    {showImport && <Modal title="Nhập danh sách học sinh" onClose={() => setShowImport(false)}>
      <p className="modal-help">Dùng đúng các cột: <strong>Họ tên, Giới tính, Chiều cao, Cân nặng, Điểm, Ưu tiên, Ghi chú, Avatar</strong>. Avatar có thể là URL ảnh; cột ưu tiên nhập “x” hoặc để trống.</p>
      <div className="template-buttons"><button className="file-button" onClick={() => downloadStudentTemplate('csv')}><FileDown size={16}/> Tải CSV mẫu</button><button className="file-button" onClick={() => downloadStudentTemplate('txt')}><FileDown size={16}/> Tải TXT mẫu</button></div>
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
        <GuideStep number="1" title="Tạo và thiết lập lớp" text="Chọn “Tạo lớp học mới”, nhập số hàng, cột, số ghế mỗi bàn và kiểu bố cục phù hợp." />
        <GuideStep number="2" title="Thêm danh sách học sinh" text="Thêm từng học sinh hoặc nhập nhanh CSV/TXT. Bạn có thể chỉnh sửa thông tin bất kỳ lúc nào." />
        <GuideStep number="3" title="Xếp chỗ" text="Ở chế độ 2D, kéo thẻ học sinh vào ghế hoặc nhấp học sinh rồi nhấp ghế. Dùng tự động sắp xếp để tạo phương án nhanh." />
        <GuideStep number="4" title="Cố định và xuất bản" text="Khóa các vị trí cần giữ nguyên trước khi xáo trộn, sau đó xuất PDF để in hoặc chia sẻ." />
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

function StudentsPage({ room, query, setQuery, onAdd, onEdit, onDelete, onImport, onGoToSeats }: {
  room: Classroom; query: string; setQuery: (value: string) => void; onAdd: () => void; onEdit: (student: Student) => void; onDelete: (id: string) => void; onImport: () => void; onGoToSeats: () => void
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
    <div className="page-hero"><div><div className="eyebrow">HỌC SINH <span>/</span> {room.name.toUpperCase()}</div><h1>Danh sách học sinh</h1><p>Quản lý hồ sơ và theo dõi trạng thái xếp chỗ của từng học sinh.</p></div><div className="page-actions"><button className="ghost-button" onClick={onImport}><FileUp size={16}/> Nhập danh sách</button><button className="primary-button" onClick={onAdd}><Plus size={17}/> Thêm học sinh</button></div></div>
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
    hint: 'Kéo một học sinh đã có chỗ sang ghế khác để đổi vị trí.',
  },
  {
    eyebrow: 'BƯỚC 4 · SẮP XẾP',
    title: 'Chọn cách sắp xếp tự động',
    text: 'Mở “Tự động sắp xếp” rồi chọn ngẫu nhiên, theo tên, học lực, giới tính hoặc chiều cao. Các ghế đã khóa sẽ luôn được giữ nguyên.',
    hint: 'Bạn đã sẵn sàng tạo sơ đồ đầu tiên!',
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