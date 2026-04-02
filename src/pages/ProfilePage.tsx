import { useCallback, useRef, useState } from "react";
import {
  deleteAllUserData,
  exportJsonBlob,
  mergeImportPayload,
  parseImportPayloadJson,
  triggerDownload,
} from "../db/profileData";

type StatusKind = "idle" | "success" | "error";

export function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: StatusKind; message: string }>({
    kind: "idle",
    message: "",
  });

  const showSuccess = useCallback((message: string) => {
    setStatus({ kind: "success", message });
  }, []);

  const showError = useCallback((message: string) => {
    setStatus({ kind: "error", message });
  }, []);

  async function downloadJson() {
    setExportBusy(true);
    setStatus({ kind: "idle", message: "" });
    try {
      const blob = await exportJsonBlob();
      const stamp = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `gymoverload-backup-${stamp}.json`);
      showSuccess("Backup downloaded.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExportBusy(false);
    }
  }

  async function handleFile(file: File) {
    setImportBusy(true);
    setStatus({ kind: "idle", message: "" });
    try {
      const text = await file.text();
      const payload = parseImportPayloadJson(text);
      const { added } = await mergeImportPayload(payload);
      const parts = [
        `${added.exercises} exercise${added.exercises === 1 ? "" : "s"}`,
        `${added.workouts} workout plan${added.workouts === 1 ? "" : "s"}`,
        `${added.workoutSessions} session${added.workoutSessions === 1 ? "" : "s"}`,
        `${added.loggedExerciseEntries} logged set${added.loggedExerciseEntries === 1 ? "" : "s"}`,
      ];
      showSuccess(`Import finished. Added ${parts.join(", ")}. Nothing you already had was removed or overwritten.`);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function confirmDeleteAll() {
    if (!confirm("Delete all exercises, workout plans, sessions, and logged sets? This cannot be undone.")) {
      return;
    }
    if (!confirm("Are you sure? Everything in this app on this device will be removed.")) {
      return;
    }
    setDeleteBusy(true);
    setStatus({ kind: "idle", message: "" });
    try {
      await deleteAllUserData();
      showSuccess("All data has been deleted.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="form">
      <p className="muted" style={{ marginTop: 0 }}>
        Download a JSON backup of everything stored in this app on this device. Use import to copy that data in from a
        file (for example after switching browsers or devices).
      </p>

      <section className="form-section">
        <h2>Export</h2>
        <div className="toolbar" style={{ marginTop: 0, justifyContent: "flex-start", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" disabled={exportBusy} onClick={() => void downloadJson()}>
            Download backup (JSON)
          </button>
        </div>
      </section>

      <section className="form-section">
        <h2>Import</h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: "0.65rem", fontSize: "0.9rem" }}>
          Choose a JSON file exported from GymOverload (same format as Download backup). Here is what happens:
        </p>
        <ul className="profile-import-list muted">
          <li>
            The import merges with what is already here: every exercise, workout plan, completed session, and logged set
            in the file is inserted as new data. Nothing you already have is removed or overwritten. Importing the same
            file twice adds a second copy of everything in that file.
          </li>
          <li>
            Each imported record gets a new ID so it cannot clash with existing rows. References inside the backup are
            updated accordingly: sessions point at the newly created workout plans, and logged sets point at the new
            sessions and planned exercise rows.
          </li>
          <li>
            Sessions are only imported when their workout plan is included in the same file. Logged sets are only imported
            when they can be tied to a remapped session and planned exercise. Anything in the file that would leave a
            dangling reference is skipped.
          </li>
        </ul>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          aria-label="Choose JSON backup file to import"
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={importBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          {importBusy ? "Importing…" : "Choose JSON file…"}
        </button>
      </section>

      <section className="form-section">
        <h2>Danger zone</h2>
        <button type="button" className="btn btn-danger" disabled={deleteBusy} onClick={() => void confirmDeleteAll()}>
          {deleteBusy ? "Deleting…" : "Delete all data"}
        </button>
      </section>

      {status.kind === "success" && (
        <p className="profile-status profile-status--ok" role="status">
          {status.message}
        </p>
      )}
      {status.kind === "error" && (
        <p className="profile-status profile-status--err" role="alert">
          {status.message}
        </p>
      )}
    </div>
  );
}
