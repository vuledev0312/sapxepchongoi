import { useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, OrbitControls, RoundedBox } from '@react-three/drei'
import { Vector3 } from 'three'
import type { Group } from 'three'
import type { Classroom, SeatPosition, Student } from './types'
import { getDisplayName, getSeats } from './lib'

/** Khoảng cách giữa hai ghế cạnh nhau trong cùng một bàn (đơn vị scene).
 *  Nới rộng để nhãn tên của hai học sinh cùng bàn tách hẳn sang hai phía,
 *  không còn tràn chồng lên nhau (theo yêu cầu dịch hai học sinh ra hai bên). */
const SEAT_SPACING = 2.3
/** Bán kính (pixel) để coi con trỏ là đang nhắm vào một ghế khi kéo thả từ danh sách học sinh. */
const SEAT_PICK_RADIUS = 110
/** Phần thời gian bay phải trôi qua trước khi ghế "nhận" học sinh (đổi màu, hiện nhãn tên). */
const LANDING_POINT = 0.55

/** API cho phép giao diện ngoài canvas hỏi “ghế nào đang nằm dưới con trỏ”. */
export interface SceneHandle {
  seatAt: (x: number, y: number) => string | null
}

interface SceneProps {
  room: Classroom
  onSeatClick: (seatId: string) => void
  /** Kéo học sinh từ ghế này sang ghế khác ngay trong khung 3D. */
  onSeatSwap?: (fromSeatId: string, toSeatId: string) => void
  /** Ghế đang được nhắm tới khi kéo thẻ học sinh từ danh sách thả vào khung 3D. */
  highlightSeatId?: string | null
  /** Nhận API tìm ghế theo tọa độ con trỏ (dùng cho kéo thả từ ngoài canvas). */
  handleRef?: MutableRefObject<SceneHandle | null>
  /** seatId → thời điểm bắt đầu bay (ms). Học sinh sẽ bay vào chỗ theo kiểu anime. */
  flights?: Record<string, number>
  flightDuration?: number
  /** seatId → thông tin cú nhảy đổi chỗ (kéo thả hoặc đổi vị trí). */
  hops?: Record<string, HopRequest>
  hopDuration?: number
}

/** Yêu cầu phát hiệu ứng nhảy: bắt đầu khi nào và nhảy từ ghế nào sang. */
export interface HopRequest {
  startAt: number
  /** Ghế cũ của học sinh; bỏ trống nghĩa là nhảy tại chỗ (vừa được đưa từ danh sách chờ vào). */
  fromSeatId?: string
}

interface ResolvedHop {
  startAt: number
  /** Độ lệch ban đầu trong hệ tọa độ của ghế đích. */
  offset: [number, number, number]
}

/** Vị trí thực tế của ghế trong không gian (đã tính độ lệch ghế và góc xoay của bàn). */
function getSeatWorldPosition(seat: SeatPosition, height = 1.5) {
  const offset = seat.seatIndex - (seat.seatCount - 1) / 2
  const point = new Vector3(offset * SEAT_SPACING, height, 1)
  point.applyAxisAngle(new Vector3(0, 1, 0), seat.rotation)
  return point.add(new Vector3(seat.x, 0, seat.z))
}

/**
 * Chiếu vị trí từng ghế lên màn hình để tìm ghế gần con trỏ nhất.
 * Sự kiện kéo thả HTML không đi qua raycaster của r3f nên cần cách tra cứu riêng.
 */
function SeatPicker({ seats, handleRef }: { seats: SeatPosition[]; handleRef?: MutableRefObject<SceneHandle | null> }) {
  const camera = useThree(state => state.camera)
  const size = useThree(state => state.size)
  useEffect(() => {
    if (!handleRef) return
    handleRef.current = {
      seatAt: (x, y) => {
        let nearest: string | null = null
        let nearestDistance = SEAT_PICK_RADIUS
        seats.forEach(seat => {
          const point = getSeatWorldPosition(seat, 1).project(camera)
          const screenX = (point.x * .5 + .5) * size.width
          const screenY = (-point.y * .5 + .5) * size.height
          const distance = Math.hypot(screenX - x, screenY - y)
          if (distance < nearestDistance) { nearestDistance = distance; nearest = seat.id }
        })
        return nearest
      },
    }
    return () => { handleRef.current = null }
  }, [seats, camera, size, handleRef])
  return null
}

/**
 * Cho biết học sinh của ghế này đã (gần) đáp xuống chưa.
 *
 * `<Html>` của drei render thẳng ra DOM chứ không theo cờ `visible` của three, nên nếu
 * không hẹn giờ thì nhãn tên sẽ hiện ở chỗ mới trước cả khi người bay tới — trông rất mất
 * hấp dẫn. Hook trả về `false` trong lúc học sinh còn đang chờ tới lượt / còn đang bay.
 */
function useLanded(startAt: number | undefined, duration: number) {
  const landAt = startAt === undefined ? 0 : startAt + duration * LANDING_POINT
  const [landed, setLanded] = useState(() => Date.now() >= landAt)
  useEffect(() => {
    const wait = landAt - Date.now()
    if (wait <= 0) { setLanded(true); return }
    setLanded(false)
    const timer = window.setTimeout(() => setLanded(true), wait)
    return () => window.clearTimeout(timer)
  }, [landAt])
  return landed
}

/** Hiệu ứng học sinh "bay" từ trên cao vào chỗ ngồi, tốc độ vừa phải như anime. */
function FlyIn({ startAt, duration, children }: { startAt?: number; duration: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    const group = ref.current
    if (!group) return
    if (startAt === undefined) {
      group.position.set(0, 0, 0); group.rotation.set(0, 0, 0); group.scale.setScalar(1); group.visible = true
      return
    }
    const elapsed = Date.now() - startAt
    if (elapsed < 0) { group.visible = false; return }
    group.visible = true
    const t = Math.min(1, elapsed / duration)
    // easeOutBack nhẹ để có cảm giác "đáp xuống" mềm mại
    const ease = t < 1 ? 1 - Math.pow(1 - t, 3) : 1
    const swirl = (1 - ease) * Math.PI * 2
    group.position.set(Math.sin(swirl) * 2.6 * (1 - ease), (1 - ease) * 7.5, Math.cos(swirl) * 2.6 * (1 - ease))
    group.rotation.set((1 - ease) * 0.5, swirl, (1 - ease) * 0.35)
    group.scale.setScalar(0.55 + ease * 0.45)
  })
  return <group ref={ref}>{children}</group>
}

/**
 * Hiệu ứng "nhảy chỗ": học sinh bật lên theo cung parabol từ ghế cũ sang ghế mới,
 * kèm squash & stretch và một vòng xoay nhẹ cho cảm giác nhí nhảnh.
 */
function Hop({ hop, duration, children }: { hop?: ResolvedHop; duration: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    const group = ref.current
    if (!group) return
    if (!hop) {
      group.position.set(0, 0, 0); group.rotation.set(0, 0, 0); group.scale.set(1, 1, 1)
      return
    }
    const elapsed = Date.now() - hop.startAt
    if (elapsed < 0) {
      // Chưa tới lượt: vẫn đứng ở ghế cũ để không bị "nhảy trước"
      group.position.set(hop.offset[0], hop.offset[1], hop.offset[2]); group.rotation.set(0, 0, 0); group.scale.set(1, 1, 1)
      return
    }
    const t = Math.min(1, elapsed / duration)
    // Di chuyển ngang mượt (easeInOutSine), độ cao theo hình cung sin
    const ease = 0.5 - Math.cos(Math.PI * t) / 2
    const distance = Math.hypot(hop.offset[0], hop.offset[2])
    const lift = Math.sin(Math.PI * t) * (0.85 + Math.min(1.6, distance * 0.28))
    group.position.set(hop.offset[0] * (1 - ease), hop.offset[1] * (1 - ease) + lift, hop.offset[2] * (1 - ease))
    group.rotation.set(0, (1 - ease) * Math.PI * -2, Math.sin(Math.PI * t) * 0.12)
    // Squash lúc rời ghế và lúc đáp, stretch khi đang bay
    const squash = t < 0.18 ? 1 - (0.18 - t) / 0.18 * 0.28 : t > 0.86 ? 1 - (t - 0.86) / 0.14 * 0.22 : 1 + Math.sin(Math.PI * t) * 0.1
    group.scale.set(2 - squash, squash, 2 - squash)
  })
  return <group ref={ref}>{children}</group>
}

function Desk({ seat, students, assignments, onSeatClick, flights, flightDuration, hop, hopDuration, drag }: {
  seat: SeatPosition
  students: Map<string, Student>
  assignments: Record<string, string>
  onSeatClick: (id: string) => void
  flights?: Record<string, number>
  flightDuration: number
  hop?: ResolvedHop
  hopDuration: number
  drag: {
    fromSeatId: string | null
    targetSeatId: string | null
    onGrab: (seatId: string) => void
    onHover: (seatId: string | null) => void
    onDropAt: (seatId: string) => void
  }
}) {
  const isFirst = seat.seatIndex === 0
  const student = students.get(assignments[seat.id])
  // Bề rộng mặt bàn nở theo khoảng cách ghế để hai ghế và nhãn tên không đè lên nhau.
  const deskWidth = 1.2 + seat.seatCount * (SEAT_SPACING + 0.35)
  const offset = seat.seatIndex - (seat.seatCount - 1) / 2
  const legX = deskWidth / 2 - 0.3
  const isDragSource = drag.fromSeatId === seat.id
  const isDropTarget = drag.targetSeatId === seat.id && drag.fromSeatId !== seat.id
  // Ghế chỉ được coi là "có người" sau khi học sinh thật sự đáp xuống, để nhãn tên và màu ghế
  // không xuất hiện trước lúc bạn ấy bay tới.
  const landed = useLanded(flights?.[seat.id], flightDuration)
  // Khi đang nhảy đổi chỗ, ghế đích cũng chỉ "sáng lên" lúc bạn ấy đáp xuống
  const hopLanded = useLanded(hop?.startAt, hopDuration)
  const seated = Boolean(student) && landed
  const occupied = seated && hopLanded
  const seatColor = isDropTarget ? '#d47758' : isDragSource ? '#7fae9f' : occupied ? '#295e52' : '#c9cec8'
  const backColor = isDropTarget ? '#e29377' : isDragSource ? '#9cc4b6' : occupied ? '#377769' : '#dde0dc'
  return (
    <group position={[seat.x, 0, seat.z]} rotation={[0, seat.rotation, 0]}>
      {isFirst && <>
        <RoundedBox args={[deskWidth, .25, 1.35]} radius={.12} position={[0, .95, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#b98b60" roughness={.7} />
        </RoundedBox>
        {[-legX, legX].map(x => <mesh key={x} position={[x, .45, 0]} castShadow><boxGeometry args={[.12, .9, .9]} /><meshStandardMaterial color="#72543d" /></mesh>)}
      </>}
      <group position={[offset * SEAT_SPACING, .1, 1]}
        onClick={e => { e.stopPropagation(); if (!drag.fromSeatId) onSeatClick(seat.id) }}
        onPointerDown={e => { if (!student) return; e.stopPropagation(); drag.onGrab(seat.id) }}
        onPointerOver={e => { if (!drag.fromSeatId) return; e.stopPropagation(); drag.onHover(seat.id) }}
        onPointerOut={() => { if (drag.targetSeatId === seat.id) drag.onHover(null) }}
        onPointerUp={e => { if (!drag.fromSeatId) return; e.stopPropagation(); drag.onDropAt(seat.id) }}>
        <mesh position={[0, .45, 0]} castShadow><boxGeometry args={[.85, .1, .75]} /><meshStandardMaterial color={seatColor} /></mesh>
        <mesh position={[0, .8, .34]} rotation={[-.15, 0, 0]} castShadow><boxGeometry args={[.85, .8, .1]} /><meshStandardMaterial color={backColor} /></mesh>
        {isDropTarget && <mesh position={[0, .06, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.5, .68, 28]} /><meshBasicMaterial color="#d47758" transparent opacity={.85} /></mesh>}
        {student && <FlyIn startAt={flights?.[seat.id]} duration={flightDuration}>
          <Hop hop={hop} duration={hopDuration}>
          <group position={[0, 1.45, .05]}>
            <mesh castShadow><sphereGeometry args={[.29, 20, 20]} /><meshStandardMaterial color={student.gender === 'Nữ' ? '#f0b08f' : student.gender === 'Nam' ? '#d89a74' : '#ddb08d'} /></mesh>
            {student.gender === 'Nữ' ? <>
              <mesh position={[0, .08, -.02]} scale={[1.08, 1.18, .82]} castShadow><sphereGeometry args={[.3, 20, 20]} /><meshStandardMaterial color="#3d2630" roughness={.85} /></mesh>
              <mesh position={[-.24, -.2, .02]} scale={[.28, .95, .34]} castShadow><sphereGeometry args={[.22, 16, 16]} /><meshStandardMaterial color="#3d2630" roughness={.85} /></mesh>
              <mesh position={[.24, -.2, .02]} scale={[.28, .95, .34]} castShadow><sphereGeometry args={[.22, 16, 16]} /><meshStandardMaterial color="#3d2630" roughness={.85} /></mesh>
            </> : <mesh position={[0, .2, -.17]} scale={[1.02, .7, .55]} castShadow><sphereGeometry args={[.3, 16, 12]} /><meshStandardMaterial color={student.gender === 'Nam' ? '#202b38' : '#5b4b42'} roughness={.9} /></mesh>}
          </group>
          <mesh position={[0, 1.04, .08]} castShadow><boxGeometry args={[.52, .1, .18]} /><meshStandardMaterial color={student.gender === 'Nữ' ? '#d66b8b' : student.gender === 'Nam' ? '#4f7894' : '#858c92'} /></mesh>
          {occupied && <Html center position={[0, 2.05, 0]} distanceFactor={10} style={{ pointerEvents: 'none' }}>
             <div className={`name-tag pop-in ${isDragSource ? 'dragging' : ''}`} title={student.role ? `${student.name} · ${student.role}` : student.name}>{student.avatar && <img src={student.avatar} alt="" />}<span className="name-tag__text">{getDisplayName(student.name)}{student.role && <em className="name-tag__role">{student.role}</em>}</span></div>
          </Html>}
          </Hop>
        </FlyIn>}
      </group>
    </group>
  )
}

/** Vị trí gốc của thân học sinh (điểm đặt ghế) trong không gian, dùng để tính quỹ đạo nhảy. */
function getSeatAnchor(seat: SeatPosition) {
  const offset = seat.seatIndex - (seat.seatCount - 1) / 2
  return new Vector3(offset * SEAT_SPACING, 0.1, 1)
    .applyAxisAngle(new Vector3(0, 1, 0), seat.rotation)
    .add(new Vector3(seat.x, 0, seat.z))
}

function Room({ room, onSeatClick, onSeatSwap, highlightSeatId, handleRef, flights, flightDuration = 1400, hops, hopDuration = 850 }: SceneProps) {
  const seats = useMemo(() => getSeats(room), [room])
  const students = useMemo(() => new Map(room.students.map(s => [s.id, s])), [room.students])
  /** Đổi seatId nguồn thành độ lệch cục bộ để component Hop chỉ cần nội suy. */
  const resolvedHops = useMemo(() => {
    if (!hops || !Object.keys(hops).length) return {} as Record<string, ResolvedHop>
    const seatById = new Map(seats.map(seat => [seat.id, seat]))
    const result: Record<string, ResolvedHop> = {}
    Object.entries(hops).forEach(([seatId, request]) => {
      const target = seatById.get(seatId)
      if (!target) return
      const from = request.fromSeatId ? seatById.get(request.fromSeatId) : undefined
      const delta = from
        ? getSeatAnchor(from).sub(getSeatAnchor(target)).applyAxisAngle(new Vector3(0, 1, 0), -target.rotation)
        : new Vector3(0, 0, 0)
      result[seatId] = { startAt: request.startAt, offset: [delta.x, delta.y, delta.z] }
    })
    return result
  }, [hops, seats])
  const [dragFromSeatId, setDragFromSeatId] = useState<string | null>(null)
  const [dragTargetSeatId, setDragTargetSeatId] = useState<string | null>(null)
  const controlsRef = useRef<any>(null)

  const drag = useMemo(() => ({
    fromSeatId: dragFromSeatId,
    targetSeatId: highlightSeatId ?? dragTargetSeatId,
    onGrab: (seatId: string) => {
      setDragFromSeatId(seatId)
      if (controlsRef.current) controlsRef.current.enabled = false
    },
    onHover: (seatId: string | null) => setDragTargetSeatId(seatId),
    onDropAt: (seatId: string) => {
      if (dragFromSeatId && onSeatSwap) onSeatSwap(dragFromSeatId, seatId)
      setDragFromSeatId(null)
      setDragTargetSeatId(null)
      if (controlsRef.current) controlsRef.current.enabled = true
    },
  }), [dragFromSeatId, dragTargetSeatId, highlightSeatId, onSeatSwap])

  useEffect(() => {
    const cancel = () => {
      if (dragFromSeatId) {
        setDragFromSeatId(null)
        setDragTargetSeatId(null)
        if (controlsRef.current) controlsRef.current.enabled = true
      }
    }
    window.addEventListener('pointerup', cancel)
    return () => window.removeEventListener('pointerup', cancel)
  }, [dragFromSeatId])

  const maxSeatCount = Math.max(...seats.map(seat => seat.seatCount), 1)
  // Hệ số 2.5 khớp với stepX trong getSeats (lib.ts) để nền lớp đủ rộng cho các bàn đã giãn ra.
  const sizeX = Math.max(14, room.columns * (3.6 + maxSeatCount * 2.5) + 6)
  const sizeZ = Math.max(12, room.rows * 4.4 + 4)
  const teacherX = (room.teacherDeskSide ?? 'right') === 'right' ? sizeX / 2 - 1.8 : -sizeX / 2 + 1.8
  return <>
    <SeatPicker seats={seats} handleRef={handleRef} />
    <color attach="background" args={['#ecebe5']} />
    <ambientLight intensity={1.7} />
    <directionalLight position={[7, 12, 6]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[sizeX, sizeZ]} /><meshStandardMaterial color="#dedbd0" /></mesh>
    <gridHelper args={[Math.max(sizeX, sizeZ), 20, '#c7c2b5', '#d4d0c5']} position={[0, .01, 0]} />
    <group position={[0, 1.5, -sizeZ / 2 + .7]}>
      <RoundedBox args={[Math.min(10, sizeX - 2), 2, .2]} radius={.08}><meshStandardMaterial color="#214b43" /></RoundedBox>
      <Html center position={[0, 0, .12]} transform distanceFactor={7}><div className="board-word">BẢNG</div></Html>
    </group>
    <group position={[teacherX, .1, -sizeZ / 2 + 2.6]}>
      <RoundedBox args={[2.6, .28, 1.25]} radius={.1} position={[0, .9, 0]} castShadow receiveShadow><meshStandardMaterial color="#8f6547" roughness={.7} /></RoundedBox>
      {[-1.1, 1.1].map(x => <mesh key={x} position={[x, .45, 0]} castShadow><boxGeometry args={[.12, .9, .9]} /><meshStandardMaterial color="#6b4d36" /></mesh>)}
      <mesh position={[0, 1.12, .1]} rotation={[-.35, 0, 0]} castShadow><boxGeometry args={[.9, .05, .6]} /><meshStandardMaterial color="#e7e4dc" /></mesh>
      <group position={[0, .55, -1.15]}>
        <mesh position={[0, .32, 0]} castShadow><boxGeometry args={[.75, .08, .68]} /><meshStandardMaterial color="#3d5b53" /></mesh>
        <mesh position={[0, .7, -.3]} castShadow><boxGeometry args={[.75, .68, .09]} /><meshStandardMaterial color="#3d5b53" /></mesh>
      </group>
      {/* Nhãn bàn giáo viên tách hai dòng để tên GVCN không bị bóp nhỏ theo chiều ngang */}
      <Html center position={[0, 1.75, 0]} distanceFactor={12}>
        <div className="teacher-label teacher-label--stacked">
          <span className="teacher-label__role">Bàn giáo viên</span>
          {room.teacher && <span className="teacher-label__name">{room.teacher}</span>}
        </div>
      </Html>
    </group>
    <group position={[(room.teacherDeskSide ?? 'right') === 'right' ? -sizeX / 2 + 1 : sizeX / 2 - 1, .7, -sizeZ / 2 + 1.2]}>
      <mesh position={[0, .8, 0]}><sphereGeometry args={[.7, 12, 12]} /><meshStandardMaterial color="#678b54" /></mesh>
      <mesh><cylinderGeometry args={[.38, .48, .8, 12]} /><meshStandardMaterial color="#a86f4b" /></mesh>
    </group>
    {seats.map(seat => <Desk key={seat.id} seat={seat} students={students} assignments={room.assignments} onSeatClick={onSeatClick} flights={flights} flightDuration={flightDuration} hop={resolvedHops[seat.id]} hopDuration={hopDuration} drag={drag} />)}
    <OrbitControls ref={controlsRef} makeDefault minDistance={8} maxDistance={35} maxPolarAngle={Math.PI / 2.08} target={[0, 0, 1]} />
    <Environment preset="city" />
  </>
}

export default function ClassroomScene(props: SceneProps) {
  return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [11, 13, 16], fov: 42 }} gl={{ preserveDrawingBuffer: true }}>
    <Room {...props} />
  </Canvas>
}