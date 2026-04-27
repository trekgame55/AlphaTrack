import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6">
      <div className="text-7xl font-bold text-primary mb-2 tracking-tight">404</div>
      <p className="text-sm text-muted-foreground mb-1">Страница не найдена</p>
      <p className="text-[11px] text-muted-foreground/70 mb-6">
        уже ночь 4:46 я тоже хочу спать
      </p>
      <Link
        href="/tasks"
        className="text-xs px-4 py-1.5 rounded-md bg-primary text-white hover:bg-primary/80 transition-colors"
      >
        На главную
      </Link>
    </div>
  );
}
