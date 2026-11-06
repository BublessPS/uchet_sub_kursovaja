import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChartColumn,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CreditCard,
  Download,
  Ellipsis,
  ExternalLink,
  FileJson,
  FolderOpen,
  Grid2X2,
  Headphones,
  HelpCircle,
  Info,
  Layers,
  LayoutDashboard,
  List,
  Menu,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Wallet,
  X,
  CircleAlert,
  Briefcase,
  PenTool,
} from "lucide-react";
import {
  CATEGORIES,
  dueLabel,
  money,
  shortDate,
  daysUntil,
  type Subscription,
  type Category,
} from "./domain";

const icons = {
  overview: LayoutDashboard,
  subscriptions: CreditCard,
  calendar: CalendarDays,
  analytics: ChartColumn,
  check: Check,
  checks: CheckCheck,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  arrowRight: ArrowRight,
  arrowUp: ArrowUpRight,
  arrowDown: ArrowDownLeft,
  bell: Bell,
  book: BookOpen,
  cloud: Cloud,
  music: Headphones,
  download: Download,
  external: ExternalLink,
  json: FileJson,
  folder: FolderOpen,
  grid: Grid2X2,
  help: HelpCircle,
  info: Info,
  layers: Layers,
  list: List,
  menu: Menu,
  more: MoreHorizontal,
  dots: Ellipsis,
  pause: Pause,
  pencil: Pencil,
  play: Play,
  plus: Plus,
  refresh: RefreshCw,
  search: Search,
  settings: Settings,
  shield: ShieldCheck,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
  target: Target,
  trash: Trash2,
  upload: Upload,
  wallet: Wallet,
  x: X,
  alert: CircleAlert,
  export: ArrowDownToLine,
  briefcase: Briefcase,
  pen: PenTool,
};
export type IconName = keyof typeof icons;
export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const Element = icons[name];
  return (
    <Element
      aria-hidden="true"
      size={size}
      strokeWidth={1.8}
      className={className}
    />
  );
}
export function ServiceIcon({
  subscription,
  category,
  small = false,
}: {
  subscription?: Subscription;
  category?: Category;
  small?: boolean;
}) {
  const cat = category ?? subscription!.category;
  const meta = CATEGORIES[cat];
  const name = subscription?.name.toLowerCase() ?? "";
  const brand = name.startsWith("spotify")
    ? "spotify"
    : name.startsWith("telegram")
      ? "telegram"
      : name === "кинопоиск"
        ? "kinopoisk"
        : name === "start"
          ? "start"
          : name === "okko"
            ? "okko"
            : name === "иви"
              ? "ivi"
              : null;
  const brandColors = {
    spotify: "#1db954",
    telegram: "#2aabee",
    kinopoisk: "#ff662d",
    start: "#e52b44",
    okko: "#7041df",
    ivi: "#e72e68",
  };
  return (
    <span
      aria-hidden="true"
      className={`service-icon ${small ? "small" : ""} ${brand ? "service-brand" : ""}`}
      style={{
        color: brand ? "#fff" : meta.color,
        background: brand ? brandColors[brand] : `${meta.color}15`,
      }}
    >
      {brand === "spotify" ? (
        <svg
          width={small ? 24 : 30}
          height={small ? 24 : 30}
          viewBox="0 0 32 32"
        >
          <circle cx="16" cy="16" r="13" fill="currentColor" />
          <g fill="none" stroke={brandColors.spotify} strokeLinecap="round">
            <path d="M9 12c5-1.5 10-1 14 1.2" strokeWidth="2.6" />
            <path d="M10 16.5c4-1.1 8-.6 12 1.1" strokeWidth="2.2" />
            <path d="M11 21c3-.7 6-.4 9.5.9" strokeWidth="1.9" />
          </g>
        </svg>
      ) : brand === "telegram" ? (
        <svg
          width={small ? 23 : 28}
          height={small ? 23 : 28}
          viewBox="0 0 24 24"
        >
          <path
            fill="currentColor"
            d="M20.9 3.6 17.7 20c-.2 1.1-.9 1.4-1.8.8l-4.8-3.5-2.4 2.3c-.3.3-.5.5-1 .5l.4-5L17.3 6c.4-.4-.1-.6-.6-.3L5.3 12.9.6 11.4c-1-.3-1.1-1 .2-1.5L19 2.9c.9-.3 1.7.2 1.9.7Z"
          />
        </svg>
      ) : brand ? (
        <span className={`brand-wordmark brand-${brand}`}>
          {
            (
              {
                kinopoisk: "К",
                start: "START",
                okko: "okko",
                ivi: "иви",
              } as Record<string, string>
            )[brand]
          }
        </span>
      ) : (
        <Icon name={meta.icon} size={small ? 19 : 24} />
      )}
    </span>
  );
}
export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="folder" size={30} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = "";
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const box = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 id="dialog-title">{title}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Закрыть окно"
          onClick={onClose}
        >
          <Icon name="x" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function SubscriptionCard({
  sub,
  today,
  edit,
  toggle,
  pay,
}: {
  sub: Subscription;
  today: Date;
  edit: () => void;
  toggle: () => void;
  pay: () => void;
}) {
  const days = daysUntil(sub.nextPayment, today);
  return (
    <article
      className={`subscription-card ${sub.status === "paused" ? "is-paused" : ""}`}
    >
      <div className="subscription-top">
        <ServiceIcon subscription={sub} />
        <button
          className="icon-button muted"
          onClick={edit}
          aria-label={`Редактировать ${sub.name}`}
        >
          <Icon name="more" />
        </button>
      </div>
      <button className="subscription-name" onClick={edit}>
        {sub.name}
      </button>
      <div className="subscription-category">
        {CATEGORIES[sub.category].name}
        <span className={`status-dot ${sub.status}`} />
        {sub.status === "active" ? "Активна" : "На паузе"}
      </div>
      <div className="subscription-price">
        {money(sub.amount)}
        <span>/ {sub.cycle === "monthly" ? "месяц" : "год"}</span>
      </div>
      {sub.priceType === "official" && sub.sourceUrl ? (
        <a
          className="price-source official"
          href={sub.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Официальный источник цены ${sub.name}`}
        >
          <Icon name="external" size={11} />
          Официальный тариф
        </a>
      ) : sub.priceType === "demo" ? (
        <button
          className="price-source example"
          onClick={edit}
          aria-label={`Условия примерной цены ${sub.name}`}
        >
          <Icon name="info" size={12} />
          Пример цены в ₽
        </button>
      ) : (
        <span className="price-source manual">Указана вручную</span>
      )}
      <div className="subscription-billing">
        <span>
          <Icon name="calendar" size={15} />
          {shortDate(sub.nextPayment)}
        </span>
        <span
          className={`due-badge ${sub.status === "paused" ? "neutral" : days <= sub.reminderDays ? (days < 0 ? "overdue" : "soon") : ""}`}
        >
          {sub.status === "paused"
            ? "Приостановлена"
            : dueLabel(sub.nextPayment, today)}
        </span>
      </div>
      <div className="subscription-footer">
        <span className="reminder-caption">
          <Icon name="bell" size={14} />
          {sub.reminderDays === 0
            ? "В день оплаты"
            : `За ${sub.reminderDays} дн.`}
        </span>
        <div className="card-actions">
          <button
            className="icon-button"
            title={sub.status === "active" ? "Приостановить" : "Возобновить"}
            aria-label={`${sub.status === "active" ? "Приостановить" : "Возобновить"} ${sub.name}`}
            onClick={toggle}
          >
            <Icon name={sub.status === "active" ? "pause" : "play"} size={15} />
          </button>
          {sub.status === "active" && (
            <button
              className="icon-button"
              title="Отметить оплату"
              aria-label={`Отметить оплату ${sub.name}`}
              onClick={pay}
            >
              <Icon name="check" size={17} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
export function UpcomingItem({
  sub,
  date,
  today,
  onClick,
}: {
  sub: Subscription;
  date?: string;
  today: Date;
  onClick: () => void;
}) {
  const value = date ?? sub.nextPayment;
  return (
    <button className="upcoming-item" onClick={onClick}>
      <ServiceIcon subscription={sub} small />
      <span className="upcoming-name">
        <strong>{sub.name}</strong>
        <span>
          {dueLabel(value, today)} · {shortDate(value)}
        </span>
      </span>
      <strong className="upcoming-price">{money(sub.amount)}</strong>
    </button>
  );
}
