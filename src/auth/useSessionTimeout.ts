
import { useEffect } from "react";
import { useAuth } from "./AuthContext";

const INACTIVITY_LIMIT = 15 * 60 * 1000;

export function useSessionTimeout() {
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!user) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const logout = () => {
      void signOut().catch((error) => {
        console.error("Automatic logout failed:", error);
      });
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(logout, INACTIVITY_LIMIT);
    };

    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);

      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, signOut]);
}
