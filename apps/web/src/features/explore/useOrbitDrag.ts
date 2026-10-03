import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';

// how far the pointer has to move before a press turns into a drag, so normal clicks still work
const DRAG_THRESHOLD = 6;

export interface DragState {
  id: string;
  x: number;
  y: number;
  /** the card under the pointer, only set when it's a place you're allowed to drop */
  overId: string | null;
}

interface Options {
  canDrop: (draggedId: string, targetId: string) => boolean;
  onDrop: (draggedId: string, targetId: string) => void;
}

/** whatever card is under the pointer, found by its data-drop-id */
function targetAt(x: number, y: number): string | null {
  if (typeof document.elementFromPoint !== 'function') return null;
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-id]');
  return el?.dataset.dropId ?? null;
}

/**
 * drag a person card onto another card to change their manager (fr-12)
 * mouse and pen only, touch keeps scrolling the page and uses the change manager button instead
 */
export function useOrbitDrag({ canDrop, onDrop }: Options) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const pressed = useRef<{ id: string; x: number; y: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const justDragged = useRef(false);
  const latest = useRef({ canDrop, onDrop });
  latest.current = { canDrop, onDrop };

  const update = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent) => {
      const start = pressed.current;
      if (!start) return;
      const current = dragRef.current;
      if (!current && Math.hypot(event.clientX - start.x, event.clientY - start.y) < DRAG_THRESHOLD)
        return;
      const over = targetAt(event.clientX, event.clientY);
      update({
        id: start.id,
        x: event.clientX,
        y: event.clientY,
        overId: over && latest.current.canDrop(start.id, over) ? over : null,
      });
    };
    const onUp = () => {
      const current = dragRef.current;
      if (current) {
        justDragged.current = true;
        if (current.overId) latest.current.onDrop(current.id, current.overId);
      }
      pressed.current = null;
      update(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dragRef.current) {
        pressed.current = null;
        justDragged.current = true;
        update(null);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // stop text getting selected while you drag across the page
  useEffect(() => {
    if (!drag) return;
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.userSelect = '';
    };
  }, [drag]);

  /** spread onto a card to make it draggable */
  const handlesFor = useCallback(
    (id: string) => ({
      onPointerDown: (event: PointerEvent) => {
        if (event.pointerType === 'touch' || event.button !== 0) return;
        pressed.current = { id, x: event.clientX, y: event.clientY };
      },
      // a drag ends with a click on the card you started on, swallow it so you don't also navigate
      onClickCapture: (event: MouseEvent) => {
        if (justDragged.current) {
          event.preventDefault();
          event.stopPropagation();
          justDragged.current = false;
        }
      },
    }),
    [],
  );

  return { drag, handlesFor };
}
