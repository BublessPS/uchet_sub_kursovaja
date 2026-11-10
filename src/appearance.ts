export const APPEARANCE_KEY = "subly-appearance-v1";
export const WALLPAPERS = [
  {
    id: "mountains",
    name: "В горах",
    description: "Воздух и высота",
    image: "/backgrounds/mountains.webp",
  },
  {
    id: "meadow",
    name: "Золотые поля",
    description: "Тепло закатного солнца",
    image: "/backgrounds/meadow.webp",
  },
  {
    id: "coast",
    name: "У моря",
    description: "Спокойствие океана",
    image: "/backgrounds/coast.webp",
  },
] as const;
export type Background =
  (typeof WALLPAPERS)[number]["id"] | "aurora" | "gradient" | "custom";
export interface Appearance {
  background: Background;
  dim: number;
  blur: number;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  customImage?: string;
}
export const DEFAULT_APPEARANCE: Appearance = {
  background: "mountains",
  dim: 25,
  blur: 0,
  gradientFrom: "#8b9dd9",
  gradientTo: "#d6b1c5",
  gradientAngle: 135,
};

export function parseAppearance(value: unknown): Appearance {
  if (typeof value !== "object" || value === null)
    return { ...DEFAULT_APPEARANCE };
  const raw = value as Record<string, unknown>;
  const backgrounds: string[] = [
    ...WALLPAPERS.map((p) => p.id),
    "aurora",
    "gradient",
    "custom",
  ];
  const customImage =
    typeof raw.customImage === "string" &&
    raw.customImage.length < 2500000 &&
    /^data:image\/(?:webp|jpeg|png);base64,[a-zA-Z0-9+/=]+$/.test(
      raw.customImage,
    )
      ? raw.customImage
      : undefined;
  const numeric = (key: string, min: number, max: number) =>
    typeof raw[key] === "number" &&
    Number.isFinite(raw[key]) &&
    Number(raw[key]) >= min &&
    Number(raw[key]) <= max
      ? Number(raw[key])
      : DEFAULT_APPEARANCE[key as "dim" | "blur" | "gradientAngle"];
  const color = (key: "gradientFrom" | "gradientTo") =>
    typeof raw[key] === "string" && /^#[a-fA-F0-9]{6}$/.test(raw[key])
      ? raw[key]
      : DEFAULT_APPEARANCE[key];
  const background =
    typeof raw.background === "string" && backgrounds.includes(raw.background)
      ? (raw.background as Background)
      : "mountains";
  return {
    background:
      background === "custom" && !customImage ? "mountains" : background,
    dim: numeric("dim", 0, 60),
    blur: numeric("blur", 0, 12),
    gradientAngle: numeric("gradientAngle", 0, 360),
    gradientFrom: color("gradientFrom"),
    gradientTo: color("gradientTo"),
    customImage,
  };
}
export function wallpaperImage(appearance: Appearance): string {
  if (appearance.background === "custom" && appearance.customImage)
    return `url("${appearance.customImage}")`;
  if (appearance.background === "gradient")
    return `linear-gradient(${appearance.gradientAngle}deg, ${appearance.gradientFrom}, ${appearance.gradientTo})`;
  if (appearance.background === "aurora")
    return "radial-gradient(ellipse at 20% 20%, #a5c7e1, transparent 65%), radial-gradient(ellipse at 80% 70%, #c5b2df, transparent 60%), linear-gradient(140deg, #4c6e9b, #b5bdd9)";
  return `url("${WALLPAPERS.find((p) => p.id === appearance.background)?.image ?? WALLPAPERS[0].image}")`;
}

export async function prepareWallpaper(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Выберите изображение JPG, PNG или WebP.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Размер изображения — до 15 МБ.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Не удалось прочитать картинку. Выберите другой файл.");
  }
  try {
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Браузер не смог подготовить изображение.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/webp", 0.8);
    if (result.length >= 2500000)
      throw new Error(
        "Картинка слишком большая для сохранения. Выберите изображение поменьше.",
      );
    return result;
  } finally {
    bitmap.close();
  }
}
