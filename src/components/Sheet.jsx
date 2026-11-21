/** Bottom sheet; tap the dim background to close (if onClose given). */
export default function Sheet({ onClose, children, as: Tag = "div", ...rest }) {
  return (
    <div className="sheetbg on" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <Tag className="sheet" {...rest}>{children}</Tag>
    </div>
  );
}
