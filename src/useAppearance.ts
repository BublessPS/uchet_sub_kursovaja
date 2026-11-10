import { useEffect, useState } from "react";
import {
  APPEARANCE_KEY,
  DEFAULT_APPEARANCE,
  parseAppearance,
} from "./appearance";

export function useAppearance() {
  const [appearance, setAppearance] = useState(() => {
    try {
      return parseAppearance(
        JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? "null"),
      );
    } catch {
      return { ...DEFAULT_APPEARANCE };
    }
  });
  const [appearanceError, setAppearanceError] = useState("");
  useEffect(() => {
    const persist = () => {
      try {
        localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
        setAppearanceError("");
      } catch {
        setAppearanceError(
          "Не удалось сохранить оформление в браузере. Попробуйте картинку меньшего размера или разрешите локальное хранилище.",
        );
      }
    };
    const timer = setTimeout(persist, 200);
    window.addEventListener("pagehide", persist);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", persist);
    };
  }, [appearance]);
  return { appearance, setAppearance, appearanceError };
}
