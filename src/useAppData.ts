import { useEffect, useState } from "react";
import {
  createDemoData,
  STORAGE_KEY,
  validateData,
  upgradeDemoSubscriptions,
  type AppData,
} from "./domain";

export function useAppData() {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return {
        data: raw
          ? upgradeDemoSubscriptions(validateData(JSON.parse(raw)))
          : createDemoData(),
        error: "",
      };
    } catch {
      return {
        data: createDemoData(),
        error:
          "Не удалось прочитать сохраненные данные. Исходная запись сохранена до первого изменения. Можно восстановить данные из JSON в настройках.",
      };
    }
  });
  const [data, setData] = useState<AppData>(initial.data);
  const [storageError, setStorageError] = useState(initial.error);
  useEffect(() => {
    if (initial.error && data === initial.data) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError("");
    } catch {
      setStorageError(
        "Браузер не разрешил сохранить данные. Скачайте резервную копию в настройках, чтобы не потерять изменения.",
      );
    }
  }, [data, initial]);
  return { data, setData, storageError };
}
