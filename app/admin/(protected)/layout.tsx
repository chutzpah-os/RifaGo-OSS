import { logoutAction } from "@/app/actions/admin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-line bg-paper-raised px-6 py-4">
        <span className="font-display text-lg font-semibold text-primary">Painel Admin</span>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-ink-soft hover:text-primary">
            Sair
          </button>
        </form>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
