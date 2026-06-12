'use client';
import { useRouter } from 'next/navigation';

const STATUS_BADGE_STYLES = {
  todo:        'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300',
  in_progress: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  done:        'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
};

const STATUS_LABELS = {
  todo:        'To Do',
  in_progress: 'In Progress',
  done:        'Done',
};

const PRIORITY_DOT_COLORS = {
  low:    'bg-green-500',
  medium: 'bg-yellow-500',
  high:   'bg-red-500',
};

function formatShortDate(dateString) {
  if (!dateString) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));
}

function isOverdue(task) {
  return task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
}

export default function TaskCard({ task, onToggleComplete, onEdit, onDelete }) {
  const router = useRouter();
  const overdue = isOverdue(task);

  function handleCardClick() {
    router.push(`/dashboard/tasks/${task.id}`);
  }

  function handleToggle(event) {
    event.stopPropagation();
    onToggleComplete(task);
  }

  function handleEdit(event) {
    event.stopPropagation();
    onEdit(task);
  }

  function handleDelete(event) {
    event.stopPropagation();
    onDelete(task);
  }

  return (
    <div
      onClick={handleCardClick}
      className="group bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-violet-300 dark:hover:border-violet-700 transition cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${PRIORITY_DOT_COLORS[task.priority] || 'bg-zinc-400'}`} />
          <h3 className={`font-medium text-sm leading-snug truncate ${task.status === 'done' ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-50'}`}>
            {task.title}
          </h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_BADGE_STYLES[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3 ml-4">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between ml-4">
        {task.due_date ? (
          <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-zinc-400 dark:text-zinc-500'}`}>
            {overdue ? 'Overdue: ' : ''}{formatShortDate(task.due_date)}
          </span>
        ) : (
          <span />
        )}

        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
          onClick={event => event.stopPropagation()}
        >
          <button
            onClick={handleToggle}
            title={task.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
            className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 text-xs transition"
          >
            {task.status === 'done' ? 'Undo' : 'Done'}
          </button>
          <button
            onClick={handleEdit}
            title="Edit task"
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 text-xs transition"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            title="Delete task"
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 text-xs transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
