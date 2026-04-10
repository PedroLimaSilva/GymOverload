import { useEffect, useId, useState } from "react";
import { ModalPortal } from "./ModalPortal";

type Props = {
  title: string;
  initialName?: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
};

export function WorkoutGroupNameModal({ title, initialName = "", onClose, onConfirm }: Props) {
  const inputId = useId();
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  function submit() {
    onConfirm(name);
  }

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workout-group-name-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <header>
            <h2 id="workout-group-name-title">{title}</h2>
          </header>
          <div className="body">
            <label htmlFor={inputId} style={{ display: "block" }}>
              <span className="muted" style={{ fontSize: "0.85rem" }}>
                Group name
              </span>
              <input
                id={inputId}
                type="text"
                className="edit-card__textarea"
                style={{
                  marginTop: "0.35rem",
                  width: "100%",
                  boxSizing: "border-box",
                  minHeight: "2.5rem",
                }}
                placeholder="Name of group"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
              />
            </label>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={submit}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
