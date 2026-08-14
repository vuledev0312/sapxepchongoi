import { Canvas } from '@react-three/fiber'
import { Environment, Html, OrbitControls, RoundedBox } from '@react-three/drei'
import type { Classroom, SeatPosition, Student } from './types'
import { getSeats } from './lib'

interface SceneProps {
  room: Classroom
  onSeatClick: (seatId: string) => void
}

function Desk({ seat, students, assignments, onSeatClick }: {
  seat: SeatPosition
  students: Map<string, Student>
  assignments: Record<string, string>
  onSeatClick: (id: string) => void
}) {
  const isFirst = seat.seatIndex === 0
  const student = students.get(assignments[seat.id])
  const offset = seat.seatIndex - 0.5
  return (
    <group position={[seat.x, 0, seat.z]} rotation={[0, seat.rotation, 0]}>
      {isFirst && <>
        <RoundedBox args={[2.7, .25, 1.35]} radius={.12} position={[0, .95, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#b98b60" roughness={.7} />
        </RoundedBox>
        {[-1.05, 1.05].map(x => <mesh key={x} position={[x, .45, 0]} castShadow><boxGeometry args={[.12, .9, .9]} /><meshStandardMaterial color="#72543d" /></mesh>)}
      </>}
      <group position={[offset * 1.25, .1, 1]} onClick={e => { e.stopPropagation(); onSeatClick(seat.id) }}>
        <mesh position={[0, .45, 0]} castShadow><boxGeometry args={[.85, .1, .75]} /><meshStandardMaterial color={student ? '#295e52' : '#c9cec8'} /></mesh>
        <mesh position={[0, .8, .34]} rotation={[-.15, 0, 0]} castShadow><boxGeometry args={[.85, .8, .1]} /><meshStandardMaterial color={student ? '#377769' : '#dde0dc'} /></mesh>
        {student && <>
          <group position={[0, 1.45, .05]}>
            <mesh castShadow><sphereGeometry args={[.29, 20, 20]} /><meshStandardMaterial color={student.gender === 'Nữ' ? '#f0b08f' : student.gender === 'Nam' ? '#d89a74' : '#ddb08d'} /></mesh>
            {student.gender === 'Nữ' ? <>
              <mesh position={[0, .08, -.02]} scale={[1.08, 1.18, .82]} castShadow><sphereGeometry args={[.3, 20, 20]} /><meshStandardMaterial color="#3d2630" roughness={.85} /></mesh>
              <mesh position={[-.24, -.2, .02]} scale={[.28, .95, .34]} castShadow><sphereGeometry args={[.22, 16, 16]} /><meshStandardMaterial color="#3d2630" roughness={.85} /></mesh>
              <mesh position={[.24, -.2, .02]} scale={[.28, .95, .34]} castShadow><sphereGeometry args={[.22, 16, 16]} /><meshStandardMaterial color="#3d2630" roughness={.85} /></mesh>
            </> : <mesh position={[0, .2, -.17]} scale={[1.02, .7, .55]} castShadow><sphereGeometry args={[.3, 16, 12]} /><meshStandardMaterial color={student.gender === 'Nam' ? '#202b38' : '#5b4b42'} roughness={.9} /></mesh>}
          </group>
          <mesh position={[0, 1.04, .08]} castShadow><boxGeometry args={[.52, .1, .18]} /><meshStandardMaterial color={student.gender === 'Nữ' ? '#d66b8b' : student.gender === 'Nam' ? '#4f7894' : '#858c92'} /></mesh>
          <Html center position={[0, 2.05, 0]} distanceFactor={10} style={{ pointerEvents: 'none' }}>
             <div className="name-tag">{student.avatar && <img src={student.avatar} alt="" />}{student.name.split(' ').slice(-2).join(' ')}</div>
          </Html>
        </>}
      </group>
    </group>
  )
}

function Room({ room, onSeatClick }: SceneProps) {
  const seats = getSeats(room)
  const students = new Map(room.students.map(s => [s.id, s]))
  const sizeX = Math.max(14, room.columns * 4)
  const sizeZ = Math.max(12, room.rows * 4 + 4)
  return <>
    <color attach="background" args={['#ecebe5']} />
    <ambientLight intensity={1.7} />
    <directionalLight position={[7, 12, 6]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[sizeX, sizeZ]} /><meshStandardMaterial color="#dedbd0" /></mesh>
    <gridHelper args={[Math.max(sizeX, sizeZ), 20, '#c7c2b5', '#d4d0c5']} position={[0, .01, 0]} />
    <group position={[0, 1.5, -sizeZ / 2 + .7]}>
      <RoundedBox args={[Math.min(10, sizeX - 2), 2, .2]} radius={.08}><meshStandardMaterial color="#214b43" /></RoundedBox>
      <Html center position={[0, 0, .12]} transform distanceFactor={7}><div className="board-word">BẢNG</div></Html>
    </group>
    <group position={[-sizeX / 2 + 1.5, .1, -sizeZ / 2 + 2.4]}>
      <RoundedBox args={[2.4, .28, 1.2]} radius={.1} position={[0, .9, 0]}><meshStandardMaterial color="#8f6547" /></RoundedBox>
      <Html center position={[0, 1.2, 0]} distanceFactor={10}><div className="teacher-label">Bàn giáo viên</div></Html>
    </group>
    <group position={[sizeX / 2 - 1, .7, -sizeZ / 2 + 1.2]}>
      <mesh position={[0, .8, 0]}><sphereGeometry args={[.7, 12, 12]} /><meshStandardMaterial color="#678b54" /></mesh>
      <mesh><cylinderGeometry args={[.38, .48, .8, 12]} /><meshStandardMaterial color="#a86f4b" /></mesh>
    </group>
    {seats.map(seat => <Desk key={seat.id} seat={seat} students={students} assignments={room.assignments} onSeatClick={onSeatClick} />)}
    <OrbitControls makeDefault minDistance={8} maxDistance={35} maxPolarAngle={Math.PI / 2.08} target={[0, 0, 1]} />
    <Environment preset="city" />
  </>
}

export default function ClassroomScene(props: SceneProps) {
  return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [11, 13, 16], fov: 42 }} gl={{ preserveDrawingBuffer: true }}>
    <Room {...props} />
  </Canvas>
}