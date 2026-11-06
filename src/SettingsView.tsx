import { useRef, useState, type FormEvent } from "react";
import { Icon } from "./components";
import type { AppData, Settings } from "./domain";

export default function SettingsView({
  data,
  onSave,
  onNotifications,
  onExport,
  onCsv,
  onImport,
  onReset,
  onClear,
}: {
  data: AppData;
  onSave: (settings: Settings) => void;
  onNotifications: () => void;
  onExport: () => void;
  onCsv: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
  onClear: () => void;
}) {
  const [budget, setBudget] = useState(String(data.settings.budget));
  const [reminder, setReminder] = useState(data.settings.reminderDays);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const permission =
    typeof Notification !== "undefined"
      ? Notification.permission
      : "unsupported";
  function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number(budget);
    if (!Number.isFinite(value) || value < 1 || value > 10000000) {
      setError("Укажите бюджет от 1 до 10 000 000 ₽.");
      return;
    }
    setError("");
    onSave({ ...data.settings, budget: value, reminderDays: reminder });
  }
  return (
    <div className="settings-layout">
      <div className="settings-main">
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <h3>Бюджет и напоминания</h3>
              <p>Настройте учет так, как удобно вам.</p>
            </div>
            <span className="stat-symbol violet">
              <Icon name="sliders" />
            </span>
          </div>
          <form onSubmit={submit}>
            <div className="form-row">
              <label>
                Месячный бюджет, ₽
                <input
                  type="number"
                  required
                  min="1"
                  max="10000000"
                  step="0.01"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </label>
              <label>
                Напоминать по умолчанию
                <select
                  value={reminder}
                  onChange={(e) => setReminder(Number(e.target.value))}
                >
                  {Array.from(new Set([0, 1, 3, 5, 7, 14, 30, reminder]))
                    .sort((a, b) => a - b)
                    .map((d) => (
                      <option key={d} value={d}>
                        {d === 0 ? "В день оплаты" : `За ${d} дн.`}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <p className="field-help">
              Новый срок напоминания применяется к новым подпискам. У
              существующих сервисов он меняется в карточке.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" type="submit">
              <Icon name="check" size={17} />
              Сохранить настройки
            </button>
          </form>
          <div className="settings-divider" />
          <div className="notification-setting">
            <span className="stat-symbol orange">
              <Icon name="bell" />
            </span>
            <div>
              <h4>Уведомления браузера</h4>
              <p>
                {data.settings.notifications && permission === "granted"
                  ? "Включены. Проверяем сроки, пока сайт открыт."
                  : permission === "denied"
                    ? "Заблокированы. Разрешите уведомления в настройках сайта в браузере."
                    : permission === "unsupported"
                      ? "Этот браузер не поддерживает уведомления. Используйте экспорт календаря."
                      : "Получайте напоминания, пока сайт открыт."}
              </p>
            </div>
            <button
              className={`switch ${data.settings.notifications && permission === "granted" ? "on" : ""}`}
              type="button"
              role="switch"
              aria-checked={
                data.settings.notifications && permission === "granted"
              }
              aria-label="Уведомления браузера"
              disabled={permission === "unsupported"}
              onClick={onNotifications}
            >
              <span />
            </button>
          </div>
        </section>
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <h3>Ваши данные</h3>
              <p>Сохраняйте копии и переносите их между устройствами.</p>
            </div>
            <span className="stat-symbol blue">
              <Icon name="folder" />
            </span>
          </div>
          <div className="data-action">
            <span>
              <strong>Резервная копия JSON</strong>
              <small>Подписки, настройки и весь журнал оплат</small>
            </span>
            <button className="button secondary" onClick={onExport}>
              <Icon name="download" size={16} />
              Скачать
            </button>
          </div>
          <div className="data-action">
            <span>
              <strong>Восстановить из копии</strong>
              <small>Текущие данные будут заменены после подтверждения</small>
            </span>
            <button
              className="button secondary"
              onClick={() => file.current?.click()}
            >
              <Icon name="upload" size={16} />
              Загрузить
            </button>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              hidden
              aria-label="Загрузить JSON-копию"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) onImport(selected);
                e.target.value = "";
              }}
            />
          </div>
          <div className="data-action">
            <span>
              <strong>Таблица подписок CSV</strong>
              <small>Для Excel, отчета и приложений к курсовой</small>
            </span>
            <button className="button secondary" onClick={onCsv}>
              <Icon name="export" size={16} />
              Экспорт
            </button>
          </div>
        </section>
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <h3>Демонстрационные данные</h3>
              <p>Удобно для знакомства с приложением и защиты проекта.</p>
            </div>
          </div>
          <div className="settings-buttons">
            <button className="button secondary" onClick={onReset}>
              <Icon name="refresh" size={16} />
              Вернуть пример
            </button>
            <button className="button danger-secondary" onClick={onClear}>
              <Icon name="trash" size={16} />
              Очистить данные
            </button>
          </div>
        </section>
      </div>
      <aside>
        <section className="tip-card privacy-card">
          <span className="tip-icon">
            <Icon name="shield" size={27} />
          </span>
          <h3>Личное остается личным</h3>
          <p>
            Подписки сохраняются в локальном хранилище этого браузера.
            Регистрация и доступ к банковским картам не нужны.
          </p>
          <div className="tip-divider" />
          <p>
            Данные не синхронизируются между устройствами. При очистке браузера
            они удалятся — сохраните JSON-копию.
          </p>
        </section>
        <p className="aside-note">
          Subly · учебный проект
          <br />
          Учет цифровых подписок и напоминания о продлении. Версия 1.0
        </p>
      </aside>
    </div>
  );
}
