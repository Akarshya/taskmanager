import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskForm from '@/components/TaskForm';

const MAX_TITLE_LENGTH = 255;

function renderForm(task = null) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<TaskForm task={task} onSave={onSave} onClose={onClose} isSaving={false} />);
  return { onSave, onClose };
}

function submitButton() {
  return screen.getByRole('button', { name: /create task|save changes/i });
}

describe('TaskForm', () => {
  it('renders in create mode when task is null', () => {
    renderForm(null);
    expect(screen.getByText('New task')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument();
  });

  it('renders in edit mode when task is provided', async () => {
    renderForm({ title: 'Fix bug', description: '', status: 'todo', priority: 'low', due_date: null });
    await waitFor(() => expect(screen.getByText('Edit task')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('shows validation error when title is empty on submit', () => {
    renderForm();
    fireEvent.click(submitButton());
    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });

  it('does not call onSave when title is empty', () => {
    const { onSave } = renderForm();
    fireEvent.click(submitButton());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not call onSave when title exceeds max length', () => {
    const { onSave } = renderForm();
    fireEvent.change(screen.getByPlaceholderText('Task title'), {
      target: { value: 'a'.repeat(MAX_TITLE_LENGTH + 1) },
    });
    fireEvent.click(submitButton());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with trimmed title and defaults for new task', () => {
    const { onSave } = renderForm();
    fireEvent.change(screen.getByPlaceholderText('Task title'), {
      target: { value: '  Buy groceries  ' },
    });
    fireEvent.click(submitButton());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Buy groceries',
      status: 'todo',
      priority: 'medium',
    }));
  });

  it('pre-fills all fields when editing an existing task', async () => {
    const task = { title: 'Deploy app', description: 'To prod', status: 'in_progress', priority: 'high', due_date: null };
    renderForm(task);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Deploy app')).toBeInTheDocument();
      expect(screen.getByDisplayValue('To prod')).toBeInTheDocument();
      expect(screen.getByDisplayValue('In Progress')).toBeInTheDocument();
      expect(screen.getByDisplayValue('High')).toBeInTheDocument();
    });
  });

  it('clears validation error when user starts typing in the title field', () => {
    renderForm();
    fireEvent.click(submitButton());
    expect(screen.getByText('Title is required')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Task title'), {
      target: { value: 'a' },
    });
    expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
  });
});
