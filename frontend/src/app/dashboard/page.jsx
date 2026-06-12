'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSSE } from '@/hooks/useSSE';
import { api } from '@/lib/api';
import TaskCard from '@/components/TaskCard';
import TaskFilters from '@/components/TaskFilters';
import TaskForm from '@/components/TaskForm';
import Pagination from '@/components/Pagination';

const DEFAULT_FILTERS = {
  status:     '',
  search:     '',
  sort_by:    'created_at',
  sort_order: 'desc',
  page:       1,
  limit:      12,
};

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ hasActiveFilters }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4" aria-hidden="true">Tasks</div>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm">
        {hasActiveFilters
          ? 'No tasks match your filters.'
          : 'No tasks yet. Create your first one!'}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();

  const [tasks, setTasks]         = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [activeFilters, setActiveFilters] = useState(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // undefined = form hidden, null = creating new, task object = editing
  const [formTask, setFormTask]   = useState(undefined);
  const [isSaving, setIsSaving]   = useState(false);

  const fetchTasks = useCallback(async (filters) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const queryParams = new URLSearchParams();
      if (filters.status)     queryParams.set('status',     filters.status);
      if (filters.search)     queryParams.set('search',     filters.search);
      if (filters.sort_by)    queryParams.set('sort_by',    filters.sort_by);
      if (filters.sort_order) queryParams.set('sort_order', filters.sort_order);
      queryParams.set('page',  String(filters.page));
      queryParams.set('limit', String(filters.limit));

      const result = await api.get(`/tasks?${queryParams}`);
      setTasks(result.data || []);
      setPagination({ total: result.total, page: result.page, totalPages: result.pages });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks(activeFilters);
  }, [activeFilters, fetchTasks]);

  const handleSSEEvent = useCallback((event) => {
    if (event.type === 'task.created') {
      fetchTasks(activeFilters);
    } else if (event.type === 'task.updated') {
      setTasks(currentTasks =>
        currentTasks.map(task => task.id === event.data.id ? event.data : task)
      );
    } else if (event.type === 'task.deleted') {
      setTasks(currentTasks =>
        currentTasks.filter(task => task.id !== event.data.id)
      );
    }
  }, [activeFilters, fetchTasks]);

  useSSE(token, handleSSEEvent);

  async function handleToggleComplete(task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    setTasks(currentTasks =>
      currentTasks.map(currentTask =>
        currentTask.id === task.id ? { ...currentTask, status: newStatus } : currentTask
      )
    );
    try {
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
    } catch {
      setTasks(currentTasks =>
        currentTasks.map(currentTask =>
          currentTask.id === task.id ? { ...currentTask, status: task.status } : currentTask
        )
      );
    }
  }

  async function handleDelete(task) {
    if (!confirm(`Delete "${task.title}"?`)) return;
    setTasks(currentTasks => currentTasks.filter(currentTask => currentTask.id !== task.id));
    try {
      await api.delete(`/tasks/${task.id}`);
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
    } catch {
      setTasks(currentTasks => [task, ...currentTasks]);
    }
  }

  async function handleSave(payload) {
    setIsSaving(true);
    try {
      if (formTask) {
        const optimisticUpdate = { ...formTask, ...payload };
        setTasks(currentTasks =>
          currentTasks.map(task => task.id === formTask.id ? optimisticUpdate : task)
        );
        await api.patch(`/tasks/${formTask.id}`, payload);
      } else {
        const createdTask = await api.post('/tasks', payload);
        setTasks(currentTasks => [createdTask, ...currentTasks]);
        setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      }
      setFormTask(undefined);
    } catch (error) {
      if (formTask) {
        setTasks(currentTasks =>
          currentTasks.map(task => task.id === formTask.id ? formTask : task)
        );
      }
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  const hasActiveFilters = Boolean(activeFilters.search || activeFilters.status);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Tasks</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {pagination.total} task{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setFormTask(null)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition"
        >
          + New task
        </button>
      </div>

      <TaskFilters filters={activeFilters} onChange={setActiveFilters} />

      {errorMessage && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : tasks.length === 0 ? (
        <EmptyState hasActiveFilters={hasActiveFilters} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              onEdit={taskToEdit => setFormTask(taskToEdit)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={newPage => setActiveFilters(prev => ({ ...prev, page: newPage }))}
      />

      {formTask !== undefined && (
        <TaskForm
          task={formTask}
          onSave={handleSave}
          onClose={() => setFormTask(undefined)}
          isSaving={isSaving}
        />
      )}
    </>
  );
}
