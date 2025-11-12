import { useState, useEffect } from 'react';
import { promptsDB, createVersionSnapshot } from '@/lib/storage/indexedDB';
import type { PromptFormData } from '@/types/prompt';
import { usePromptStore } from '@/store/promptStore';

interface PromptLibraryProps {
  onClose: () => void;
  onLoadPrompt: (prompt: PromptFormData) => void;
}

export function PromptLibrary({ onClose, onLoadPrompt }: PromptLibraryProps) {
  const [prompts, setPrompts] = useState<PromptFormData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'updatedAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { currentPrompt } = usePromptStore();

  // Load prompts on mount
  useEffect(() => {
    loadPrompts();
  }, [sortBy, sortOrder]);

  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      let result = await promptsDB.getAllSorted(sortBy, sortOrder);

      // Apply search filter
      if (searchQuery) {
        result = await promptsDB.search(searchQuery);
      }

      // Apply model filter
      if (filterModel !== 'all') {
        result = result.filter(p => p.model === filterModel);
      }

      setPrompts(result);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reload when search or filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPrompts();
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [searchQuery, filterModel]);

  const handleSaveCurrentPrompt = async () => {
    if (!currentPrompt) return;

    try {
      // Create version snapshot before saving
      await createVersionSnapshot(currentPrompt, 'Saved from editor');

      await promptsDB.save(currentPrompt);
      await loadPrompts();
      alert('Prompt saved to library!');
    } catch (error) {
      console.error('Failed to save prompt:', error);
      alert('Failed to save prompt');
    }
  };

  const handleLoadPrompt = (prompt: PromptFormData) => {
    onLoadPrompt(prompt);
    onClose();
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      await promptsDB.delete(id);
      await loadPrompts();
      if (selectedPrompt?.id === id) {
        setSelectedPrompt(null);
      }
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      alert('Failed to delete prompt');
    }
  };

  const handleDuplicatePrompt = async (prompt: PromptFormData) => {
    const duplicate: PromptFormData = {
      ...prompt,
      id: crypto.randomUUID(),
      name: `${prompt.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };

    try {
      await promptsDB.save(duplicate);
      await loadPrompts();
    } catch (error) {
      console.error('Failed to duplicate prompt:', error);
      alert('Failed to duplicate prompt');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Prompt Library</h2>
            <p className="text-sm text-gray-500 mt-1">
              {prompts.length} prompt{prompts.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveCurrentPrompt}
              disabled={!currentPrompt}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Save Current Prompt
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter by Model */}
          <select
            value={filterModel}
            onChange={(e) => setFilterModel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Models</option>
            <option value="claude-sonnet-4.5">Claude Sonnet 4.5</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gemini-2.5">Gemini 2.5</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="updatedAt">Recently Modified</option>
            <option value="createdAt">Recently Created</option>
            <option value="name">Name</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                Loading...
              </div>
            ) : prompts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="text-lg">No prompts found</p>
                <p className="text-sm mt-2">
                  {searchQuery || filterModel !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Save your first prompt to get started'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      selectedPrompt?.id === prompt.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedPrompt(prompt)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{prompt.name}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {prompt.objective || 'No objective specified'}
                        </p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span className="px-2 py-0.5 bg-gray-100 rounded">
                            {prompt.model}
                          </span>
                          <span>{prompt.domain || 'No domain'}</span>
                          <span>{formatDate(prompt.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview/Details */}
          <div className="w-1/2 overflow-y-auto p-6">
            {selectedPrompt ? (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedPrompt.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Created {formatDate(selectedPrompt.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Model
                    </label>
                    <p className="text-sm text-gray-600">{selectedPrompt.model}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Objective
                    </label>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {selectedPrompt.objective}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Domain
                      </label>
                      <p className="text-sm text-gray-600">{selectedPrompt.domain}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Audience
                      </label>
                      <p className="text-sm text-gray-600">{selectedPrompt.audience}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Thinking Mode
                      </label>
                      <p className="text-sm text-gray-600">{selectedPrompt.thinkingMode}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Agentic Mode
                      </label>
                      <p className="text-sm text-gray-600">{selectedPrompt.agenticMode}</p>
                    </div>
                  </div>

                  {selectedPrompt.variables.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Variables ({selectedPrompt.variables.length})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedPrompt.variables.map((v, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                          >
                            {'{{'}{v.name}{'}}'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => handleLoadPrompt(selectedPrompt)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Load Prompt
                  </button>
                  <button
                    onClick={() => handleDuplicatePrompt(selectedPrompt)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => handleDeletePrompt(selectedPrompt.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Select a prompt to see details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
