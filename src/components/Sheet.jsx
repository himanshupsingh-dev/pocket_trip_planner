import { useEffect, useId, useRef, useState } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet dialog. When `onClose` is given it closes on a tap on the dim background,
 * the × button, Escape, or a swipe down on its header; without it the sheet must be answered.
 * `as="form"` (plus onSubmit) makes the body a form.
 */
export default function Sheet({ title, onClose, children, as: Tag = "div", ...rest }) {
  const ref = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [drag, setDrag] = useState(0);
  const startY = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const prev = document.activeElement;
    // keep an autoFocus field's focus; otherwise move focus into the dialog
    if (!el.contains(document.activeElement)) el.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape" && closeRef.current) {
        e.preventDefault();
        closeRef.current();
      } else if (e.key === "Tab") {
        // keep keyboard focus inside the sheet
        const items = [...el.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null);
        if (!items.length) return;
        const first = items[0], last = items.at(-1);
        if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (prev && document.contains(prev)) prev.focus?.({ preventScroll: true });
    };
  }, []);

  // swipe the header down to close
  const down = (e) => {
    if (!onClose || e.button > 0 || e.target.closest("button")) return;
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => { if (startY.current != null) setDrag(Math.max(0, e.clientY - startY.current)); };
  const up = () => {
    if (startY.current == null) return;
    startY.current = null;
    if (drag > 90) onClose();
    else setDrag(0);
  };

  return (
    <div className="sheetbg" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div
        ref={ref} className="sheet" role="dialog" aria-modal="true" tabIndex={-1}
        aria-labelledby={title ? titleId : undefined}
        style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
      >
        <div className="sheethead" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          {onClose && <div className="grab" aria-hidden="true" />}
          {title && <h2 id={titleId}>{title}</h2>}
          {onClose && (
            <button type="button" className="close" onClick={onClose} aria-label="Close">×</button>
          )}
        </div>
        <Tag className="sheetbody" {...rest}>{children}</Tag>
      </div>
    </div>
  );
}
