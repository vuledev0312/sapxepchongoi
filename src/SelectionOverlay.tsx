import { useEffect, useRef, useState } from 'react'

interface Point { x: number; y: number }
interface Props {
  active: boolean
  onSelect: (start: Point, end: Point) => void
}

/** Lớp phủ quét vùng, dùng chung cho sơ đồ 2D và canvas 3D. */
export default function SelectionOverlay({ active, onSelect }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [start, setStart] = useState<Point | null>(null)
  const [end, setEnd] = useState<Point | null>(null)

  useEffect(() => { if (!active) { setStart(null); setEnd(null) } }, [active])
  if (!active) return null

  const pointOf = (event: React.PointerEvent<HTMLDivElement>): Point => {
    const rect = rootRef.current!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  const finish = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!start) return
    const next = pointOf(event)
    setEnd(next)
    onSelect(start, next)
    setStart(null)
  }
  const left = Math.min(start?.x ?? 0, end?.x ?? 0)
  const top = Math.min(start?.y ?? 0, end?.y ?? 0)
  const width = Math.abs((start?.x ?? 0) - (end?.x ?? 0))
  const height = Math.abs((start?.y ?? 0) - (end?.y ?? 0))

  return <div ref={rootRef} className="selection-overlay" onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); const point = pointOf(event); setStart(point); setEnd(point) }} onPointerMove={event => { if (start) setEnd(pointOf(event)) }} onPointerUp={finish} onPointerCancel={() => setStart(null)}>
    {start && <div className="selection-rectangle" style={{ left, top, width, height }} />}
  </div>
}
