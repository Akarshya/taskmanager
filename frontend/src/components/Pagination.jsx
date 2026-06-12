'use client';

export default function Pagination({ currentPage, totalPages, totalItems, onPageChange }) {
  if (!totalItems) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
      >
        Prev
      </button>

      <span className="text-sm text-zinc-500 dark:text-zinc-400 px-2">
        Page {currentPage} of {totalPages || 1}
      </span>

      <button
        disabled={currentPage >= (totalPages || 1)}
        onClick={() => onPageChange(currentPage + 1)}
        className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
      >
        Next
      </button>
    </div>
  );
}
