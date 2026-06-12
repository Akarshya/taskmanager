'use client';
import { useState, useEffect } from 'react';

const STATUS_OPTIONS = [
  { value: '',            label: 'All statuses' },
  { value: 'todo',        label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done',        label: 'Done' },
];

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date created' },
  { value: 'due_date',   label: 'Due date' },
  { value: 'priority',   label: 'Priority' },
  { value: 'title',      label: 'Title' },
];

const SEARCH_DEBOUNCE_MS = 500;

const selectClass = 'px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-violet-500';

export default function TaskFilters({ filters, onChange }) {
  const [searchInput, setSearchInput] = useState(filters.search);

  // Debounce: only propagate search to parent after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ ...filters, search: searchInput, page: 1 });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local input if parent resets the search externally
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  function updateFilter(key, value) {
    onChange({ ...filters, [key]: value, page: 1 });
  }

  function toggleSortOrder() {
    updateFilter('sort_order', filters.sort_order === 'asc' ? 'desc' : 'asc');
  }

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <input
        type="search"
        placeholder="Search tasks..."
        value={searchInput}
        onChange={event => setSearchInput(event.target.value)}
        className={`flex-1 min-w-48 ${selectClass}`}
      />

      <select
        value={filters.status}
        onChange={event => updateFilter('status', event.target.value)}
        className={selectClass}
      >
        {STATUS_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <select
        value={filters.sort_by}
        onChange={event => updateFilter('sort_by', event.target.value)}
        className={selectClass}
      >
        {SORT_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <button
        onClick={toggleSortOrder}
        aria-label="Toggle sort direction"
        className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
      >
        {filters.sort_order === 'asc' ? 'Asc' : 'Desc'}
      </button>
    </div>
  );
}
