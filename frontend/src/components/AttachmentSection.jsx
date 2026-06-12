'use client';
import { useState, useRef } from 'react';
import { api } from '@/lib/api';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentSection({ taskId, attachments, onRefresh }) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  async function handleFileSelect(event) {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setErrorMessage('');
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      await api.post(`/tasks/${taskId}/attachments`, formData);
      await onRefresh();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsUploading(false);
      fileInputRef.current.value = '';
    }
  }

  async function handleDelete(attachmentId) {
    if (!confirm('Remove this attachment?')) return;
    try {
      await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
      await onRefresh();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Attachments ({attachments.length})
        </h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : '+ Attach file'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {errorMessage && (
        <p className="text-xs text-red-500 mb-2">{errorMessage}</p>
      )}

      {attachments.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">No attachments.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map(attachment => (
            <li
              key={attachment.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm"
            >
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:underline truncate flex-1 mr-2"
              >
                {attachment.file_name}
              </a>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 mr-3 flex-shrink-0">
                {formatFileSize(attachment.file_size)}
              </span>
              <button
                onClick={() => handleDelete(attachment.id)}
                title="Remove attachment"
                className="text-zinc-400 hover:text-red-500 transition text-xs flex-shrink-0"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
