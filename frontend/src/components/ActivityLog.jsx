'use client';

function formatActivityDate(dateString) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
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
            <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
            {index < activities.length - 1 && (
              <div className="w-px flex-1 bg-zinc-200 dark:bg-zinc-700 mt-1" />
            )}
          </div>
          <div className="pb-3">
            <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">
              {activity.action}
            </span>
            <span className="text-zinc-400 dark:text-zinc-500 ml-2 text-xs">
              {formatActivityDate(activity.created_at)}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
