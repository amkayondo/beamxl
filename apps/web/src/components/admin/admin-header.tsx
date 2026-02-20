export function AdminHeader({ userName }: { userName: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-8 py-4 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Administration
        </p>
        <p className="text-lg font-medium">System Overview</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-red-600/15 px-3 py-1 text-xs font-medium text-red-500">
          System Admin
        </span>
        <span className="text-sm text-muted-foreground">{userName}</span>
      </div>
    </header>
  );
}
