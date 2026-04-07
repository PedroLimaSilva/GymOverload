import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/** Renders modals on document.body so position:fixed backdrops cover the viewport (not clipped by .app-page overflow). */
export function ModalPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
