'use client';
import { useState, useEffect } from 'react';

const STATUS_OPTIONS = [
  { value: 'todo',        label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done',        label: 'Done' },
];

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
];

const MAX_TITLE_LENGTH = 255;

const EMPTY_FORM = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
};

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-violet-500';
const selectClass = `${inputClass} border-zinc-300 dark:border-zinc-700`;

export default function TaskForm({ task, onSave, onClose, isSaving }) {
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (task) {
      setFormValues({
        title:       task.title       || '',
        description: task.description || '',
        status:      task.status      || 'todo',
        priority:    task.priority    || 'medium',
        dueDate:     task.due_date    ? task.due_date.slice(0, 10) : '',
      });
    } else {
      setFormValues(EMPTY_FORM);
    }
    setValidationErrors({});
  }, [task]);

  function setField(fieldName, value) {
    setFormValues(previous => ({ ...previous, [fieldName]: value }));
    if (validationErrors[fieldName]) {
      setValidationErrors(previous => ({ ...previous, [fieldName]: undefined }));
    }
  }

  function validate() {
    const errors = {};
    const trimmedTitle = formValues.title.trim();
    if (!trimmedTitle) errors.title = 'Title is required';
    else if (trimmedTitle.length > MAX_TITLE_LENGTH) errors.title = `Title must be under ${MAX_TITLE_LENGTH} characters`;
    return errors;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const payload = {
      title:       formValues.title.trim(),
      description: formValues.description.trim(),
      status:      formValues.status,
      priority:    formValues.priority,
      due_date:    formValues.dueDate ? new Date(formValues.dueDate).toISOString() : null,
    };
    onSave(payload);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {task ? 'Edit task' : 'New task'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition text-2xl leading-none"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formValues.title}
              onChange={event => setField('title', event.target.value)}
              maxLength={MAX_TITLE_LENGTH}
              placeholder="Task title"
              className={`${inputClass} ${validationErrors.title ? 'border-red-400' : 'border-zinc-300 dark:border-zinc-700'}`}
            />
            {validationErrors.title && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              value={formValues.description}
              onChange={event => setField('description', event.target.value)}
              rows={3}
              placeholder="Optional description..."
              className={`${selectClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Status</label>
              <select
                value={formValues.status}
                onChange={event => setField('status', event.target.value)}
                className={selectClass}
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Priority</label>
              <select
                value={formValues.priority}
                onChange={event => setField('priority', event.target.value)}
                className={selectClass}
              >
                {PRIORITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Due date</label>
            <input
              type="date"
              value={formValues.dueDate}
              onChange={event => setField('dueDate', event.target.value)}
              className={selectClass}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : task ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
