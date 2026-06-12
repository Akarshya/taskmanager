'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import TaskForm from '@/components/TaskForm';
import ActivityLog from '@/components/ActivityLog';
import AttachmentSection from '@/components/AttachmentSection';

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

const PRIORITY_STYLES = {
  low:    'text-green-600 dark:text-green-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  high:   'text-red-600 dark:text-red-400',
};

const PRIORITY_LABELS = {
  low:    'Low',
  medium: 'Medium',
  high:   'High',
};

function formatLongDate(dateString) {
  if (!dateString) return 'No due date';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));
}

function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [task, setTask]               = useState(null);
  const [activities, setActivities]   = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true);
  const [isEditing, setIsEditing]     = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadTaskData() {
      try {
        const [taskData, activityList, attachmentList] = await Promise.all([
          api.get(`/tasks/${id}`),
          api.get(`/tasks/${id}/activities`),
          api.get(`/tasks/${id}/attachments`),
        ]);
        setTask(taskData);
        setActivities(activityList || []);
        setAttachments(attachmentList || []);
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
        setIsActivitiesLoading(false);
      }
    }
    loadTaskData();
  }, [id]);

  const refreshAttachments = useCallback(async () => {
    const attachmentList = await api.get(`/tasks/${id}/attachments`);
    setAttachments(attachmentList || []);
  }, [id]);

  async function handleSave(payload) {
    setIsSaving(true);
    try {
      const updatedTask = await api.patch(`/tasks/${id}`, payload);
      setTask(updatedTask);
      setIsEditing(false);
      const activityList = await api.get(`/tasks/${id}/activities`);
      setActivities(activityList || []);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <Spinner />;

  if (errorMessage || !task) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{errorMessage || 'Task not found'}</p>
        <button
          onClick={() => router.back()}
          className="text-violet-600 hover:underline text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => router.back()}
        className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-violet-600 transition mb-6 flex items-center gap-1"
      >
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Task details card */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
                {task.title}
              </h1>
              <button
                onClick={() => setIsEditing(true)}
                className="flex-shrink-0 text-sm px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Edit
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE_STYLES[task.status]}`}>
                {STATUS_LABELS[task.status]}
              </span>
              <span className={`text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}>
                {PRIORITY_LABELS[task.priority]}
              </span>
            </div>

            {task.description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4 whitespace-pre-wrap">
                {task.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-sm">
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 block text-xs mb-0.5">Due date</span>
                <span className="text-zinc-700 dark:text-zinc-300">{formatLongDate(task.due_date)}</span>
              </div>
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 block text-xs mb-0.5">Created</span>
                <span className="text-zinc-700 dark:text-zinc-300">{formatLongDate(task.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Attachments card */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <AttachmentSection
              taskId={id}
              attachments={attachments}
              onRefresh={refreshAttachments}
            />
          </div>
        </div>

        {/* Activity sidebar */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 h-fit">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Activity</h3>
          <ActivityLog activities={activities} isLoading={isActivitiesLoading} />
        </div>
      </div>

      {isEditing && (
        <TaskForm
          task={task}
          onSave={handleSave}
          onClose={() => setIsEditing(false)}
          isSaving={isSaving}
        />
      )}
    </>
  );
}
