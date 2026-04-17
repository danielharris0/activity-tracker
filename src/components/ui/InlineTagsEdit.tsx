import { useState, useRef, useEffect } from 'react';

interface InlineTagsEditProps {
  tags: string[];
  onSave: (newTags: string[]) => Promise<unknown>;
}

export function InlineTagsEdit({ tags, onSave }: InlineTagsEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(tags.join(', '));
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing, tags]);

  const handleSave = async () => {
    const newTags = draft.split(',').map(s => s.trim()).filter(Boolean);
    const same = newTags.length === tags.length && newTags.every((t, i) => t === tags[i]);
    if (same) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(newTags);
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
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  if (editing) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="tag1, tag2, tag3"
            disabled={saving}
            className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-2 py-1 bg-indigo-600 text-white rounded text-xs font-medium disabled:opacity-50 shrink-0"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => { setEditing(false); setError(null); }}
            disabled={saving}
            className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium disabled:opacity-50 shrink-0"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1 flex-wrap cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1 transition-colors"
      title="Click to edit tags"
    >
      {tags.length > 0 ? (
        tags.map((tag) => (
          <span
            key={tag}
            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
          >
            {tag}
          </span>
        ))
      ) : (
        <span className="text-xs text-gray-400 italic">No tags — click to add</span>
      )}
    </div>
  );
}
