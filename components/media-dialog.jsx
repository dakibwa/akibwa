"use client";
import { useEffect, useRef } from "react";

export function MediaDialog({ title, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const node = dialog.current,
      opener = document.activeElement,
      overflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="archive-dialog"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="archive-dialog-content">
        <button
          type="button"
          className="archive-close"
          onClick={onClose}
          aria-label="Close details"
          autoFocus
        >
          ×
        </button>
        {children}
      </div>
    </dialog>
  );
}
