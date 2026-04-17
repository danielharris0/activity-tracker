import { useState, useRef, useEffect } from 'react';

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => Promise<unknown>;
  as?: 'h2' | 'p' | 'span';
  className?: string;
  inputType?: 'text' | 'textarea';
  placeholder?: string;
  emptyText?: string;
  validate?: (value: string) => string | null;
}

export function InlineEdit({
  value,
  onSave,
  as: Tag = 'span',
  className = '',
  inputType = 'text',
  placeholder,
  emptyText = 'Click to add',
  validate,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing, value]);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    if (validate) {
      const err = validate(trimmed);
      if (err) { setError(err); return; }
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditing(false);
      setError(null);
    }
    if (e.key === 'Enter' && inputType === 'text') {
      e.preventDefault();
      handleSave();
    }
  };

  if (editing) {
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-start gap-2">
          {inputType === 'textarea' ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={3}
              disabled={saving}
              className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={saving}
              className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium disabled:opacity-50 shrink-0"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => { setEditing(false); setError(null); }}
            disabled={saving}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs font-medium disabled:opacity-50 shrink-0"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <Tag
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1 transition-colors ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-gray-400 italic">{emptyText}</span>}
    </Tag>
  );
}
