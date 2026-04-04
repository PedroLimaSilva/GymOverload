import { Navigate, useParams } from "react-router-dom";

/** Old URL: /workouts/:workoutId/sessions/:sessionId → /history/:sessionId */
export function LegacySessionRedirect() {
  const { sessionId } = useParams<{ id: string; sessionId: string }>();
  if (!sessionId) return <Navigate to="/workouts" replace />;
  return <Navigate to={`/history/${sessionId}`} replace />;
}
