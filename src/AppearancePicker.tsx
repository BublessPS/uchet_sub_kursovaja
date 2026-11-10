import { useRef, useState } from "react";
import {
  DEFAULT_APPEARANCE,
  prepareWallpaper,
  WALLPAPERS,
  wallpaperImage,
  type Appearance,
} from "./appearance";
import { Icon, Modal } from "./components";

export default function AppearancePicker({
  appearance,
  error,
  onChange,
  onClose,
}: {
  appearance: Appearance;
  error: string;
  onChange: (appearance: Appearance) => void;
  onClose: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState("");
  function update(patch: Partial<Appearance>) {
    onChange({ ...appearance, ...patch });
  }
  async function upload(file: File) {
    setUploading(true);
    setFileError("");
    try {
      update({
        customImage: await prepareWallpaper(file),
        background: "custom",
      });
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Не удалось загрузить фон.",
      );
    } finally {
      setUploading(false);
    }
  }
  return (
    <Modal
      title="Ваше пространство"
      eyebrow="ОФОРМЛЕНИЕ · LIQUID GLASS"
      onClose={onClose}
      wide
    >
      <p className="appearance-intro">
        Немного природы, немного стекла. Выберите настроение — изменения видны
        сразу.
      </p>
      <div className="wallpaper-grid">
        {WALLPAPERS.map((preset) => (
          <button
            key={preset.id}
            className={`wallpaper-option ${appearance.background === preset.id ? "selected" : ""}`}
            aria-label={`Фон: ${preset.name}`}
            aria-pressed={appearance.background === preset.id}
            onClick={() => update({ background: preset.id })}
          >
            <span
              className="wallpaper-thumb"
              style={{ backgroundImage: `url("${preset.image}")` }}
            >
              {appearance.background === preset.id && (
                <span className="wallpaper-check">
                  <Icon name="check" size={14} />
                </span>
              )}
            </span>
            <strong>{preset.name}</strong>
            <small>{preset.description}</small>
          </button>
        ))}
        <button
          className={`wallpaper-option ${appearance.background === "aurora" ? "selected" : ""}`}
          aria-label="Фон: Сияние"
          aria-pressed={appearance.background === "aurora"}
          onClick={() => update({ background: "aurora" })}
        >
          <span
            className="wallpaper-thumb"
            style={{
              backgroundImage: wallpaperImage({
                ...appearance,
                background: "aurora",
              }),
            }}
          >
            {appearance.background === "aurora" && (
              <span className="wallpaper-check">
                <Icon name="check" size={14} />
              </span>
            )}
          </span>
          <strong>Сияние</strong>
          <small>Мягкие переливы цвета</small>
        </button>
        <button
          className={`wallpaper-option ${appearance.background === "gradient" ? "selected" : ""}`}
          aria-label="Фон: Свой градиент"
          aria-pressed={appearance.background === "gradient"}
          onClick={() => update({ background: "gradient" })}
        >
          <span
            className="wallpaper-thumb gradient-thumb"
            style={{
              backgroundImage: wallpaperImage({
                ...appearance,
                background: "gradient",
              }),
            }}
          >
            <Icon name="sliders" size={24} />
            {appearance.background === "gradient" && (
              <span className="wallpaper-check">
                <Icon name="check" size={14} />
              </span>
            )}
          </span>
          <strong>Свой градиент</strong>
          <small>Смешайте любимые цвета</small>
        </button>
        <button
          className={`wallpaper-option ${appearance.background === "custom" ? "selected" : ""}`}
          aria-label={
            appearance.customImage ? "Фон: Своя картинка" : "Загрузить свой фон"
          }
          aria-pressed={appearance.background === "custom"}
          disabled={uploading}
          onClick={() =>
            appearance.customImage
              ? update({ background: "custom" })
              : fileInput.current?.click()
          }
        >
          <span
            className={`wallpaper-thumb upload-thumb ${appearance.customImage ? "has-image" : ""}`}
            style={
              appearance.customImage
                ? { backgroundImage: `url("${appearance.customImage}")` }
                : undefined
            }
          >
            {!appearance.customImage && <Icon name="upload" size={24} />}
            {appearance.background === "custom" && (
              <span className="wallpaper-check">
                <Icon name="check" size={14} />
              </span>
            )}
          </span>
          <strong>{uploading ? "Подготавливаем…" : "Своя картинка"}</strong>
          <small>Ваш любимый пейзаж</small>
        </button>
      </div>
      <input
        ref={fileInput}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Загрузить изображение фона"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />
      {appearance.background === "gradient" && (
        <div className="gradient-controls">
          <label>
            Первый цвет
            <input
              type="color"
              value={appearance.gradientFrom}
              onChange={(e) => update({ gradientFrom: e.target.value })}
            />
          </label>
          <span className="gradient-arrow">
            <Icon name="arrowRight" size={18} />
          </span>
          <label>
            Второй цвет
            <input
              type="color"
              value={appearance.gradientTo}
              onChange={(e) => update({ gradientTo: e.target.value })}
            />
          </label>
          <label className="angle-control">
            Угол · {appearance.gradientAngle}°
            <input
              type="range"
              min="0"
              max="360"
              value={appearance.gradientAngle}
              onChange={(e) =>
                update({ gradientAngle: Number(e.target.value) })
              }
            />
          </label>
        </div>
      )}
      <div className="appearance-sliders">
        <label>
          <span>
            Затемнение фона <output>{appearance.dim}%</output>
          </span>
          <input
            type="range"
            min="0"
            max="60"
            value={appearance.dim}
            onChange={(e) => update({ dim: Number(e.target.value) })}
          />
        </label>
        <label>
          <span>
            Размытие фона <output>{appearance.blur} px</output>
          </span>
          <input
            type="range"
            min="0"
            max="12"
            value={appearance.blur}
            onChange={(e) => update({ blur: Number(e.target.value) })}
          />
        </label>
      </div>
      {(fileError || error) && (
        <p className="form-error" role="alert">
          {fileError || error}
        </p>
      )}
      <div className="appearance-upload-row">
        <button
          className="text-button"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
        >
          <Icon name="upload" size={15} />
          {appearance.customImage
            ? "Заменить свою картинку"
            : "Загрузить с устройства"}
        </button>
        {appearance.customImage ? (
          <button
            className="text-button remove-wallpaper"
            onClick={() =>
              update({
                customImage: undefined,
                ...(appearance.background === "custom"
                  ? { background: "mountains" }
                  : {}),
              })
            }
          >
            Удалить картинку
          </button>
        ) : (
          <span>JPG, PNG, WebP · до 15 МБ</span>
        )}
      </div>
      <div className="appearance-privacy">
        <Icon name="shield" size={14} />
        <span>
          Своя картинка остается в этом браузере. Оформление сохраняется
          автоматически.
        </span>
      </div>
      <div className="modal-footer">
        <button
          className="text-button"
          onClick={() => onChange({ ...DEFAULT_APPEARANCE })}
        >
          <Icon name="refresh" size={14} />
          Сбросить оформление
        </button>
        <button className="button primary" onClick={onClose}>
          <Icon name="check" size={16} />
          Красиво, оставить
        </button>
      </div>
    </Modal>
  );
}
