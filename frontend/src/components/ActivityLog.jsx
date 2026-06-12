'use client';

const FIELD_LABELS = {
  title:       'Title',
  description: 'Description',
  status:      'Status',
  priority:    'Priority',
  due_date:    'Due date',
};

const STATUS_LABELS = {
  todo:        'To Do',
  in_progress: 'In Progress',
  done:        'Done',
};

const PRIORITY_LABELS = {
  low:    'Low',
  medium: 'Medium',
  high:   'High',
};

function formatFieldValue(field, value) {
  if (field === 'status')   return STATUS_LABELS[value]   || value;
  if (field === 'priority') return PRIORITY_LABELS[value] || value;
  if (field === 'due_date') return value ? new Date(value).toLocaleDateString() : 'none';
  if (typeof value === 'string' && value.length > 50) return `"${value.slice(0, 50)}…"`;
  return `"${value}"`;
}

function describeActivity(activity) {
  let changes = {};
  try {
    changes = typeof activity.changes === 'string'
      ? JSON.parse(activity.changes)
      : (activity.changes || {});
  } catch {
    changes = {};
  }

  switch (activity.action) {
    case 'created':
      return 'Task created';

    case 'deleted':
      return 'Task deleted';

    case 'attachment_added':
      return `Attached "${changes.file_name || 'file'}"`;

    case 'attachment_removed':
      return `Removed attachment "${changes.file_name || 'file'}"`;

    case 'updated': {
      const parts = Object.entries(changes)
        .filter(([key]) => FIELD_LABELS[key])
        .map(([key, value]) => `${FIELD_LABELS[key]} → ${formatFieldValue(key, value)}`);
      return parts.length > 0 ? parts.join(' · ') : 'Updated';
    }

    default:
      return activity.action;
  }
}

function formatActivityDate(dateString) {
  return new Intl.DateTimeFormat('en-US', {
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function Spinner() {
  return (
    <div className="flex justify-center py-6">
      <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ActivityLog({ activities, isLoading }) {
  if (isLoading) return <Spinner />;

  if (activities.length === 0) {
    return (
      <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4 text-center">
        No activity yet.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {activities.map((activity, index) => (
        <li key={activity.id} className="flex gap-3 text-sm">
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
              activity.action === 'created'             ? 'bg-green-500'  :
              activity.action === 'deleted'             ? 'bg-red-500'    :
              activity.action.startsWith('attachment')  ? 'bg-blue-500'   :
              'bg-violet-500'
            }`} />
            {index < activities.length - 1 && (
              <div className="w-px flex-1 bg-zinc-200 dark:bg-zinc-700 mt-1" />
            )}
          </div>
          <div className="pb-3 min-w-0">
            <p className="text-zinc-800 dark:text-zinc-200 leading-snug">
              {describeActivity(activity)}
            </p>
            <span className="text-zinc-400 dark:text-zinc-500 text-xs">
              {formatActivityDate(activity.created_at)}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
