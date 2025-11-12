/**
 * Workflow Template Marketplace Panel
 *
 * UI for browsing, searching, importing, and exporting workflow templates
 */

import React, { useState, useMemo } from 'react';
import {
  workflowTemplateMarketplace,
  type WorkflowTemplate,
  type TemplateCategory,
  type TemplateFilter,
  type TemplateReview,
} from '@/lib/workflow/workflowTemplateMarketplace';
import { useWorkflowStore } from '@/store/workflowStore';

interface WorkflowTemplateMarketplacePanelProps {
  onClose: () => void;
}

type ViewMode = 'browse' | 'details' | 'favorites' | 'export';

const CATEGORIES: Array<{ value: TemplateCategory; label: string; icon: string }> = [
  { value: 'code-generation', label: 'Code Generation', icon: '💻' },
  { value: 'research-synthesis', label: 'Research & Synthesis', icon: '🔬' },
  { value: 'content-creation', label: 'Content Creation', icon: '✍️' },
  { value: 'data-analysis', label: 'Data Analysis', icon: '📊' },
  { value: 'testing-qa', label: 'Testing & QA', icon: '🧪' },
  { value: 'documentation', label: 'Documentation', icon: '📝' },
  { value: 'planning-strategy', label: 'Planning & Strategy', icon: '🎯' },
  { value: 'review-critique', label: 'Review & Critique', icon: '🔍' },
  { value: 'general', label: 'General', icon: '⚙️' },
];

export function WorkflowTemplateMarketplacePanel({ onClose }: WorkflowTemplateMarketplacePanelProps) {
  const { nodes, edges, setNodes, setEdges, addNodes, addEdges } = useWorkflowStore();

  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [minRating, setMinRating] = useState(0);
  const [officialOnly, setOfficialOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'downloads' | 'rating' | 'createdAt' | 'name'>('downloads');

  // Export state
  const [exportName, setExportName] = useState('');
  const [exportDescription, setExportDescription] = useState('');
  const [exportCategory, setExportCategory] = useState<TemplateCategory>('general');
  const [exportTags, setExportTags] = useState('');

  // Get templates with filters
  const templates = useMemo(() => {
    const filter: TemplateFilter = {
      search: searchQuery || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      minRating: minRating > 0 ? minRating : undefined,
      officialOnly: officialOnly || undefined,
      sortBy,
      sortOrder: 'desc',
    };
    return workflowTemplateMarketplace.searchTemplates(filter);
  }, [searchQuery, selectedCategory, minRating, officialOnly, sortBy]);

  const favorites = useMemo(() => {
    return workflowTemplateMarketplace.getFavorites();
  }, []);

  const stats = useMemo(() => {
    return workflowTemplateMarketplace.getStats();
  }, []);

  // Handlers
  const handleImportTemplate = (templateId: string) => {
    const result = workflowTemplateMarketplace.importTemplate(templateId, {
      preserveIds: false,
      position: { x: 100, y: 100 },
    });

    if (result) {
      addNodes(result.nodes);
      addEdges(result.edges);
      alert(`Template imported successfully! Added ${result.nodes.length} agents.`);
      onClose();
    } else {
      alert('Failed to import template.');
    }
  };

  const handleExportTemplate = () => {
    if (!exportName.trim()) {
      alert('Please enter a template name.');
      return;
    }

    const tags = exportTags.split(',').map(t => t.trim()).filter(t => t);

    const json = workflowTemplateMarketplace.exportTemplate(
      nodes,
      edges,
      {
        name: exportName,
        description: exportDescription,
        category: exportCategory,
        tags,
        author: {
          id: 'user',
          name: 'User',
          verified: false,
        },
        version: '1.0.0',
        rating: 0,
        reviews: 0,
        variables: [],
        requirements: [],
        isOfficial: false,
        isCommunity: true,
        license: 'MIT',
        featured: false,
        deprecated: false,
      },
      { includeMetadata: true, includeStats: false }
    );

    // Download as JSON file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportName.toLowerCase().replace(/\s+/g, '-')}.template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Template exported successfully!');
  };

  const handleToggleFavorite = (templateId: string) => {
    const isFav = workflowTemplateMarketplace.isFavorite(templateId);
    if (isFav) {
      workflowTemplateMarketplace.removeFavorite(templateId);
    } else {
      workflowTemplateMarketplace.addFavorite(templateId);
    }
    // Force re-render
    setViewMode(prev => prev);
  };

  const handleViewDetails = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setViewMode('details');
  };

  const getRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="text-yellow-400">
            {i < fullStars ? '★' : hasHalfStar && i === fullStars ? '⯨' : '☆'}
          </span>
        ))}
        <span className="ml-1 text-xs text-gray-600">({rating.toFixed(1)})</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">📦 Template Marketplace</h2>
            <p className="text-purple-100 text-sm mt-1">
              Browse, import, and share workflow templates
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 px-3 py-1 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">{stats.totalTemplates}</div>
            <div className="text-purple-100 text-xs">Templates</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">{stats.totalDownloads}</div>
            <div className="text-purple-100 text-xs">Downloads</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)} ★</div>
            <div className="text-purple-100 text-xs">Avg Rating</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">{favorites.length}</div>
            <div className="text-purple-100 text-xs">Favorites</div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { mode: 'browse' as ViewMode, label: '🔍 Browse', badge: templates.length },
            { mode: 'favorites' as ViewMode, label: '⭐ Favorites', badge: favorites.length },
            { mode: 'export' as ViewMode, label: '📤 Export Current', badge: null },
          ].map(({ mode, label, badge }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === mode
                  ? 'bg-white text-purple-600 font-semibold shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {label}
              {badge !== null && (
                <span className="ml-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Browse View */}
        {viewMode === 'browse' && (
          <div>
            {/* Filters */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🔍 Search
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📁 Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory | 'all')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Min Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ⭐ Min Rating
                  </label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={3}>3+ Stars</option>
                    <option value={4}>4+ Stars</option>
                    <option value={4.5}>4.5+ Stars</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🔄 Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="downloads">Most Downloaded</option>
                    <option value="rating">Highest Rated</option>
                    <option value="createdAt">Newest</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>

                {/* Official Only */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ✓ Filters
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={officialOnly}
                      onChange={(e) => setOfficialOnly(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Official Only</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleViewDetails(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        {template.isOfficial && (
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                            ✓ Official
                          </span>
                        )}
                        {template.featured && (
                          <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                            ⭐ Featured
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(template.id);
                      }}
                      className="text-xl ml-2"
                    >
                      {workflowTemplateMarketplace.isFavorite(template.id) ? '❤️' : '🤍'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    {getRatingStars(template.rating)}
                    <span className="text-xs text-gray-500">
                      {template.downloads} downloads
                    </span>
                    <span className="text-xs text-gray-500">
                      {template.nodes.length} agents
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.tags.slice(0, 4).map(tag => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 4 && (
                      <span className="text-xs text-gray-500">
                        +{template.tags.length - 4} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>by {template.author.name}</span>
                    <span>v{template.version}</span>
                  </div>
                </div>
              ))}
            </div>

            {templates.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">📭</div>
                <div>No templates found matching your filters.</div>
              </div>
            )}
          </div>
        )}

        {/* Details View */}
        {viewMode === 'details' && selectedTemplate && (
          <div>
            <button
              onClick={() => setViewMode('browse')}
              className="mb-4 text-purple-600 hover:text-purple-700 font-medium"
            >
              ← Back to Browse
            </button>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              {/* Template Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                    {selectedTemplate.isOfficial && (
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                        ✓ Official
                      </span>
                    )}
                    {selectedTemplate.featured && (
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                        ⭐ Featured
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600">{selectedTemplate.description}</p>
                </div>
                <button
                  onClick={() => handleToggleFavorite(selectedTemplate.id)}
                  className="text-3xl ml-4"
                >
                  {workflowTemplateMarketplace.isFavorite(selectedTemplate.id) ? '❤️' : '🤍'}
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Rating</div>
                  {getRatingStars(selectedTemplate.rating)}
                  <div className="text-xs text-gray-500 mt-1">{selectedTemplate.reviews} reviews</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Downloads</div>
                  <div className="text-2xl font-bold">{selectedTemplate.downloads}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Agents</div>
                  <div className="text-2xl font-bold">{selectedTemplate.nodes.length}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Version</div>
                  <div className="text-2xl font-bold">{selectedTemplate.version}</div>
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-4 mb-6">
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">📁 Category</div>
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                    {CATEGORIES.find(c => c.value === selectedTemplate.category)?.icon}{' '}
                    {CATEGORIES.find(c => c.value === selectedTemplate.category)?.label}
                  </span>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">🏷️ Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.tags.map(tag => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">👤 Author</div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900">{selectedTemplate.author.name}</span>
                    {selectedTemplate.author.verified && (
                      <span className="text-blue-500">✓</span>
                    )}
                    {selectedTemplate.author.organization && (
                      <span className="text-gray-500 text-sm">
                        · {selectedTemplate.author.organization}
                      </span>
                    )}
                  </div>
                </div>

                {selectedTemplate.variables.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">⚙️ Variables</div>
                    <div className="space-y-2">
                      {selectedTemplate.variables.map(variable => (
                        <div key={variable.name} className="bg-gray-50 rounded p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono text-purple-600">{variable.name}</code>
                            {variable.required && (
                              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded">
                                Required
                              </span>
                            )}
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">
                              {variable.type}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">{variable.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTemplate.requirements.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">📋 Requirements</div>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {selectedTemplate.requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTemplate.estimatedCost && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">💰 Estimated Cost</div>
                    <div className="text-sm text-gray-600">
                      {selectedTemplate.estimatedCost.currency} {selectedTemplate.estimatedCost.min.toFixed(2)} - {selectedTemplate.estimatedCost.max.toFixed(2)}
                    </div>
                  </div>
                )}

                {selectedTemplate.estimatedDuration && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">⏱️ Estimated Duration</div>
                    <div className="text-sm text-gray-600">
                      {selectedTemplate.estimatedDuration.min}-{selectedTemplate.estimatedDuration.max} {selectedTemplate.estimatedDuration.unit}
                    </div>
                  </div>
                )}
              </div>

              {/* Import Button */}
              <button
                onClick={() => handleImportTemplate(selectedTemplate.id)}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                📥 Import Template to Canvas
              </button>
            </div>
          </div>
        )}

        {/* Favorites View */}
        {viewMode === 'favorites' && (
          <div>
            {favorites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {favorites.map(template => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleViewDetails(template)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          {template.isOfficial && (
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                              ✓ Official
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(template.id);
                        }}
                        className="text-xl ml-2"
                      >
                        ❤️
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      {getRatingStars(template.rating)}
                      <span className="text-xs text-gray-500">
                        {template.downloads} downloads
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImportTemplate(template.id);
                      }}
                      className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      📥 Import
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">💔</div>
                <div>No favorite templates yet.</div>
                <div className="text-sm mt-2">Click the heart icon on templates to save them here.</div>
              </div>
            )}
          </div>
        )}

        {/* Export View */}
        {viewMode === 'export' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Export Current Workflow as Template</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    placeholder="My Awesome Workflow"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={exportDescription}
                    onChange={(e) => setExportDescription(e.target.value)}
                    placeholder="Describe what this workflow does..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={exportCategory}
                    onChange={(e) => setExportCategory(e.target.value as TemplateCategory)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={exportTags}
                    onChange={(e) => setExportTags(e.target.value)}
                    placeholder="workflow, automation, ai-agents"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm text-blue-800">
                    <strong>Current Workflow:</strong>
                    <div className="mt-2 space-y-1">
                      <div>• {nodes.length} agents</div>
                      <div>• {edges.length} connections</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleExportTemplate}
                  disabled={!exportName.trim()}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  📤 Export Template (JSON)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
