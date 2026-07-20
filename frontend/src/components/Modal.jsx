export default function Modal({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-ink-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl2 shadow-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
          <h2 className="font-display text-lg text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-600 hover:text-ink-900 text-xl leading-none"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
