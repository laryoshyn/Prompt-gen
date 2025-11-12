/**
 * Template Marketplace Dialog
 *
 * Comprehensive UI for browsing, saving, and loading hierarchical team templates
 * Features:
 * - Tabs: My Templates, Marketplace, Favorites
 * - Search and filtering
 * - Template preview
 * - Save/Load/Edit/Delete operations
 * - Import/Export functionality
 */

import { useState } from 'react';
import {
  hierarchicalTeamTemplateMarketplace,
  type HierarchicalTeamTemplate,
  type TeamTemplateCategory,
  type TemplateNestedMember,
} from '@/lib/workflow/hierarchicalTeamTemplateMarketplace';

interface TemplateMarketplaceDialogProps {
  onClose: () => void;
  onLoadTemplate: (template: {
    hierarchyName: string;
    description: string;
    teamName: string;
    leaderId: string;
    members: TemplateNestedMember[];
    maxDepth: number;
    maxTeamSize: number;
  }) => void;
  currentState?: {
    hierarchyName: string;
    description: string;
    teamName: string;
    leaderId: string;
    members: TemplateNestedMember[];
    maxDepth: number;
    maxTeamSize: number;
  };
}

type Tab = 'my-templates' | 'marketplace' | 'favorites';

export function TemplateMarketplaceDialog({
  onClose,
  onLoadTemplate,
  currentState,
}: TemplateMarketplaceDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>('marketplace');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TeamTemplateCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<HierarchicalTeamTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<HierarchicalTeamTemplate | null>(null);

  // Save form state
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveCategory, setSaveCategory] = useState<TeamTemplateCategory>('general');
  const [saveTags, setSaveTags] = useState('');

  // Get templates based on active tab
  const getDisplayTemplates = (): HierarchicalTeamTemplate[] => {
    let templates: HierarchicalTeamTemplate[] = [];

    switch (activeTab) {
      case 'my-templates':
        templates = hierarchicalTeamTemplateMarketplace.getUserTemplates();
        break;
      case 'marketplace':
        templates = hierarchicalTeamTemplateMarketplace.getAllTemplates();
        break;
      case 'favorites':
        templates = hierarchicalTeamTemplateMarketplace.getFavorites();
        break;
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return templates;
  };

  const handleSaveCurrentState = () => {
    if (!currentState || !saveName) {
      alert('Please enter a template name');
      return;
    }

    const metadata = {
      name: saveName,
      description: saveDescription,
      category: saveCategory,
      tags: saveTags.split(',').map(t => t.trim()).filter(Boolean),
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
      license: 'MIT' as const,
      featured: false,
      deprecated: false,
    };

    hierarchicalTeamTemplateMarketplace.addTemplate({
      ...currentState,
      ...metadata,
    });

    setShowSaveDialog(false);
    setSaveName('');
    setSaveDescription('');
    setSaveTags('');
    setActiveTab('my-templates');
  };

  const handleLoadTemplate = (template: HierarchicalTeamTemplate) => {
    const result = hierarchicalTeamTemplateMarketplace.importTemplate(template.id);
    if (result) {
      onLoadTemplate(result);
      onClose();
    }
  };

  const handleDeleteTemplate = (template: HierarchicalTeamTemplate) => {
    if (confirm(`Delete template "${template.name}"?`)) {
      hierarchicalTeamTemplateMarketplace.deleteTemplate(template.id);
      setSelectedTemplate(null);
      setShowPreview(false);
    }
  };

  const handleToggleFavorite = (template: HierarchicalTeamTemplate) => {
    const isFav = hierarchicalTeamTemplateMarketplace.isFavorite(template.id);
    if (isFav) {
      hierarchicalTeamTemplateMarketplace.removeFavorite(template.id);
    } else {
      hierarchicalTeamTemplateMarketplace.addFavorite(template.id);
    }
    // Force re-render by updating selected template
    setSelectedTemplate({ ...template });
  };

  const handleExportTemplate = (template: HierarchicalTeamTemplate) => {
    const json = hierarchicalTeamTemplateMarketplace.exportTemplate(
      {
        hierarchyName: template.hierarchyName,
        description: template.description,
        teamName: template.teamName,
        leaderId: template.leaderId,
        members: template.members,
        maxDepth: template.maxDepth,
        maxTeamSize: template.maxTeamSize,
      },
      {
        name: template.name,
        category: template.category,
        tags: template.tags,
        author: template.author,
        version: template.version,
        rating: template.rating,
        reviews: template.reviews,
        variables: template.variables,
        requirements: template.requirements,
        isOfficial: template.isOfficial,
        isCommunity: template.isCommunity,
        license: template.license,
        featured: template.featured,
        deprecated: template.deprecated,
      },
      { includeMetadata: true, includeStats: true }
    );

    // Download as file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTemplate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const json = event.target?.result as string;
          const template = hierarchicalTeamTemplateMarketplace.importTemplateFromJSON(json);
          if (template) {
            setActiveTab('my-templates');
            alert('Template imported successfully!');
          } else {
            alert('Failed to import template. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const countMembers = (members: TemplateNestedMember[]): number => {
    let count = members.length;
    members.forEach(m => {
      if (m.subMembers) {
        count += countMembers(m.subMembers);
      }
    });
    return count;
  };

  const categories: { value: TeamTemplateCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Categories' },
    { value: 'software-development', label: 'Software Development' },
    { value: 'research-analysis', label: 'Research & Analysis' },
    { value: 'content-production', label: 'Content Production' },
    { value: 'quality-assurance', label: 'Quality Assurance' },
    { value: 'project-management', label: 'Project Management' },
    { value: 'customer-support', label: 'Customer Support' },
    { value: 'general', label: 'General' },
  ];

  const displayTemplates = getDisplayTemplates();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Team Template Marketplace</h2>
            <p className="text-sm text-gray-500 mt-1">
              Browse, save, and load hierarchical team templates
            </p>
          </div>
          <div className="flex gap-2">
            {currentState && (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                💾 Save Current
              </button>
            )}
            <button
              onClick={handleImportTemplate}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              📥 Import
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-4 py-3 font-medium text-sm border-b-2 ${
                activeTab === 'marketplace'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🏪 Marketplace
            </button>
            <button
              onClick={() => setActiveTab('my-templates')}
              className={`px-4 py-3 font-medium text-sm border-b-2 ${
                activeTab === 'my-templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📁 My Templates ({hierarchicalTeamTemplateMarketplace.getUserTemplates().length})
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-4 py-3 font-medium text-sm border-b-2 ${
                activeTab === 'favorites'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              ⭐ Favorites ({hierarchicalTeamTemplateMarketplace.getFavorites().length})
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {displayTemplates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">No templates found</p>
              <p className="text-sm">
                {activeTab === 'my-templates'
                  ? 'Save your current team configuration to create your first template'
                  : activeTab === 'favorites'
                  ? 'Browse the marketplace and add templates to your favorites'
                  : 'Try adjusting your search or filters'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayTemplates.map(template => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer bg-white"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowPreview(true);
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">
                        {template.name}
                      </h3>
                      {template.isOfficial && (
                        <span className="inline-block px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                          ✓ Official
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(template);
                      }}
                      className="text-xl"
                    >
                      {hierarchicalTeamTemplateMarketplace.isFavorite(template.id) ? '⭐' : '☆'}
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {template.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    <span>⭐ {template.rating.toFixed(1)}</span>
                    <span>📥 {template.downloads}</span>
                    <span>👥 {countMembers(template.members) + 1}</span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="px-2 py-0.5 text-xs text-gray-500">
                        +{template.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Preview Header */}
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedTemplate.name}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>by {selectedTemplate.author.name}</span>
                    {selectedTemplate.author.verified && <span>✓ Verified</span>}
                    <span>•</span>
                    <span>v{selectedTemplate.version}</span>
                    <span>•</span>
                    <span>{selectedTemplate.category}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleLoadTemplate(selectedTemplate)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Load Template
                </button>
                <button
                  onClick={() => handleToggleFavorite(selectedTemplate)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  {hierarchicalTeamTemplateMarketplace.isFavorite(selectedTemplate.id)
                    ? '⭐ Remove from Favorites'
                    : '☆ Add to Favorites'}
                </button>
                <button
                  onClick={() => handleExportTemplate(selectedTemplate)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  📤 Export
                </button>
                {!selectedTemplate.isOfficial && (
                  <button
                    onClick={() => handleDeleteTemplate(selectedTemplate)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Preview Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700">{selectedTemplate.description}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500 mb-1">Rating</div>
                  <div className="text-lg font-bold text-gray-900">
                    ⭐ {selectedTemplate.rating.toFixed(1)}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500 mb-1">Downloads</div>
                  <div className="text-lg font-bold text-gray-900">
                    📥 {selectedTemplate.downloads}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500 mb-1">Total Agents</div>
                  <div className="text-lg font-bold text-gray-900">
                    👥 {countMembers(selectedTemplate.members) + 1}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500 mb-1">Max Depth</div>
                  <div className="text-lg font-bold text-gray-900">
                    📊 {selectedTemplate.maxDepth}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              {selectedTemplate.requirements.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Requirements</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {selectedTemplate.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Team Structure Preview */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Team Structure</h4>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-sm">
                    <div className="font-medium mb-2">
                      {selectedTemplate.teamName} ({selectedTemplate.hierarchyName})
                    </div>
                    <div className="ml-4 space-y-1 text-gray-600">
                      <div>• Leader: {selectedTemplate.leaderId}</div>
                      {selectedTemplate.members.map((member, i) => (
                        <div key={i} className="ml-4">
                          • {member.specialization || member.role} - {member.capabilities.join(', ')}
                          {member.subMembers && member.subMembers.length > 0 && (
                            <span className="text-xs ml-2">
                              ({member.subMembers.length} sub-members)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Save as Template</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g., My Awesome Team"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Describe your team template..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value as TeamTemplateCategory)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.filter(c => c.value !== 'all').map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
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
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                  placeholder="e.g., agile, development, full-stack"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCurrentState}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
