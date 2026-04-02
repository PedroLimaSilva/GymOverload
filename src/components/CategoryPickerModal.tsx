import {
  EXERCISE_CATEGORIES,
  type ExerciseCategory,
} from "../model/types";

type Props = {
  title: string;
  showClear: boolean;
  selected: ExerciseCategory[];
  onChange: (next: ExerciseCategory[]) => void;
  onClose: () => void;
};

export function CategoryPickerModal({
  title,
  showClear,
  selected,
  onChange,
  onClose,
}: Props) {
  function toggle(cat: ExerciseCategory) {
    if (selected.includes(cat)) {
      onChange(selected.filter((c) => c !== cat));
    } else {
      onChange([...selected, cat]);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cat-picker-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2 id="cat-picker-title">{title}</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {showClear && (
              <button type="button" className="btn btn-ghost" onClick={() => onChange([])}>
                Clear
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </header>
        <div className="body">
          {EXERCISE_CATEGORIES.map((cat) => (
            <label key={cat} className="check-row">
              <span>{cat}</span>
              <input
                type="checkbox"
                checked={selected.includes(cat)}
                onChange={() => toggle(cat)}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
