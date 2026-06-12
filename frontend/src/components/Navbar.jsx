'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-bold text-lg text-violet-600">TaskManager</span>

        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">
            {user?.email}
          </span>

          {user?.role === 'admin' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-medium">
              Admin
            </span>
          )}

          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <img
              src={isDark ? '/sun.svg' : '/moon.svg'}
              alt={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              width={18}
              height={18}
              className="invert-0 dark:invert"
            />
          </button>

          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
