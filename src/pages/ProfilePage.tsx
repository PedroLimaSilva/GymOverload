import { useCallback, useRef, useState } from "react";
import {
  deleteAllUserData,
  exportCsvBlob,
  exportJsonBlob,
  mergeImportPayload,
  parseImportPayloadCsv,
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
      showSuccess("JSON export downloaded.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExportBusy(false);
    }
  }

  async function downloadCsv() {
    setExportBusy(true);
    setStatus({ kind: "idle", message: "" });
    try {
      const blob = await exportCsvBlob();
      const stamp = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `gymoverload-backup-${stamp}.csv`);
      showSuccess("CSV export downloaded.");
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
      const lower = file.name.toLowerCase();
      const payload =
        lower.endsWith(".csv") || (!lower.endsWith(".json") && text.trimStart().startsWith("type,"))
          ? parseImportPayloadCsv(text)
          : parseImportPayloadJson(text);
      await mergeImportPayload(payload);
      showSuccess(
        `Imported ${payload.exercises.length} exercises, ${payload.templates.length} templates, ${payload.workoutSessions.length} sessions (merged into existing data).`
      );
    } catch (e) {
      showError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function confirmDeleteAll() {
    if (!confirm("Delete all exercises, templates, and workout history? This cannot be undone.")) {
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
        Back up your data or bring it in from another device. Import always adds records; it does not replace what you
        already have.
      </p>

      <section className="form-section">
        <h2>Export</h2>
        <div className="toolbar" style={{ marginTop: 0, justifyContent: "flex-start", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" disabled={exportBusy} onClick={() => void downloadJson()}>
            Download JSON
          </button>
          <button type="button" className="btn" disabled={exportBusy} onClick={() => void downloadCsv()}>
            Download CSV
          </button>
        </div>
        <p className="muted" style={{ marginTop: "0.5rem", marginBottom: 0, fontSize: "0.85rem" }}>
          JSON is the full backup. CSV uses one row per record with embedded JSON (best for spreadsheets that can store
          long text).
        </p>
      </section>

      <section className="form-section">
        <h2>Import</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv,application/json,text/csv"
          className="sr-only"
          aria-label="Choose backup file to import"
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
          {importBusy ? "Importing…" : "Choose file…"}
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
