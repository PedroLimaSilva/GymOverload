import { FolderPlus, Plus } from "lucide-react";
import { ModalPortal } from "./ModalPortal";

type Props = {
  onClose: () => void;
  onCreateWorkout: () => void;
  onCreateGroup: () => void;
};

export function WorkoutCreateChoiceModal({ onClose, onCreateWorkout, onCreateGroup }: Props) {
  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workout-create-choice-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <header>
            <h2 id="workout-create-choice-title">What would you like to create?</h2>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
          </header>
          <div className="body workout-create-choice-modal__body">
            <button
              type="button"
              className="workout-create-choice-modal__option"
              onClick={onCreateWorkout}
            >
              <Plus
                size={22}
                aria-hidden
                strokeWidth={2.2}
                className="workout-create-choice-modal__icon"
              />
              <span>Workout</span>
            </button>
            <button
              type="button"
              className="workout-create-choice-modal__option"
              onClick={onCreateGroup}
            >
              <FolderPlus
                size={22}
                aria-hidden
                strokeWidth={2.2}
                className="workout-create-choice-modal__icon"
              />
              <span>Workout group</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
