/**
 * Workflow Template Marketplace
 *
 * Provides a library of shareable workflow templates with:
 * - Template categorization and tagging
 * - Import/export functionality
 * - Version management
 * - Search and filtering
 * - Community sharing features
 */

import type { Node, Edge } from 'reactflow';

// ============================================================================
// Types
// ============================================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  author: TemplateAuthor;
  version: string;
  createdAt: string;
  updatedAt: string;
  downloads: number;
  rating: number;
  reviews: number;

  // Workflow structure
  nodes: Node[];
  edges: Edge[];

  // Configuration
  variables: TemplateVariable[];
  requirements: string[];
  estimatedCost?: {
    min: number;
    max: number;
    currency: string;
  };
  estimatedDuration?: {
    min: number;
    max: number;
    unit: 'seconds' | 'minutes' | 'hours';
  };

  // Metadata
  isOfficial: boolean;
  isCommunity: boolean;
  license: 'MIT' | 'Apache-2.0' | 'GPL-3.0' | 'Proprietary';
  featured: boolean;
  deprecated: boolean;

  // Usage
  usageCount: number;
  lastUsed?: string;
}

export type TemplateCategory =
  | 'code-generation'
  | 'research-synthesis'
  | 'content-creation'
  | 'data-analysis'
  | 'testing-qa'
  | 'documentation'
  | 'planning-strategy'
  | 'review-critique'
  | 'general';

export interface TemplateAuthor {
  id: string;
  name: string;
  avatar?: string;
  verified: boolean;
  organization?: string;
}

export interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: unknown;
  examples?: unknown[];
}

export interface TemplateFilter {
  category?: TemplateCategory;
  tags?: string[];
  author?: string;
  search?: string;
  minRating?: number;
  officialOnly?: boolean;
  sortBy?: 'downloads' | 'rating' | 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface TemplateImportOptions {
  preserveIds?: boolean;
  autoConnect?: boolean;
  position?: { x: number; y: number };
}

export interface TemplateExportOptions {
  includeMetadata?: boolean;
  includeStats?: boolean;
  format?: 'json' | 'yaml';
}

export interface TemplateReview {
  id: string;
  templateId: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful: number;
}

export interface TemplateStats {
  totalTemplates: number;
  totalDownloads: number;
  averageRating: number;
  categoryCounts: Record<TemplateCategory, number>;
  topTags: Array<{ tag: string; count: number }>;
  recentlyAdded: number;
  recentlyUpdated: number;
}

// ============================================================================
// Workflow Template Marketplace Manager
// ============================================================================

export class WorkflowTemplateMarketplace {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private reviews: Map<string, TemplateReview[]> = new Map();
  private userFavorites: Set<string> = new Set();

  constructor() {
    this.initializeDefaultTemplates();
  }

  // ------------------------------------------------------------------------
  // Template Management
  // ------------------------------------------------------------------------

  /**
   * Add a template to the marketplace
   */
  addTemplate(template: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'downloads' | 'usageCount'>): WorkflowTemplate {
    const id = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const fullTemplate: WorkflowTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now,
      downloads: 0,
      usageCount: 0,
    };

    this.templates.set(id, fullTemplate);
    return fullTemplate;
  }

  /**
   * Update an existing template
   */
  updateTemplate(templateId: string, updates: Partial<WorkflowTemplate>): WorkflowTemplate | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const updated = {
      ...template,
      ...updates,
      id: template.id, // Preserve ID
      createdAt: template.createdAt, // Preserve creation time
      updatedAt: new Date().toISOString(),
    };

    this.templates.set(templateId, updated);
    return updated;
  }

  /**
   * Delete a template
   */
  deleteTemplate(templateId: string): boolean {
    const deleted = this.templates.delete(templateId);
    if (deleted) {
      this.reviews.delete(templateId);
      this.userFavorites.delete(templateId);
    }
    return deleted;
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(templateId: string): WorkflowTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get all templates
   */
  getAllTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  // ------------------------------------------------------------------------
  // Search & Filter
  // ------------------------------------------------------------------------

  /**
   * Search and filter templates
   */
  searchTemplates(filter: TemplateFilter = {}): WorkflowTemplate[] {
    let results = Array.from(this.templates.values());

    // Filter by category
    if (filter.category) {
      results = results.filter(t => t.category === filter.category);
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(t =>
        filter.tags!.some(tag => t.tags.includes(tag))
      );
    }

    // Filter by author
    if (filter.author) {
      results = results.filter(t =>
        t.author.name.toLowerCase().includes(filter.author!.toLowerCase())
      );
    }

    // Filter by search query
    if (filter.search) {
      const query = filter.search.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by minimum rating
    if (filter.minRating !== undefined) {
      results = results.filter(t => t.rating >= filter.minRating!);
    }

    // Filter official only
    if (filter.officialOnly) {
      results = results.filter(t => t.isOfficial);
    }

    // Remove deprecated templates
    results = results.filter(t => !t.deprecated);

    // Sort results
    const sortBy = filter.sortBy || 'downloads';
    const sortOrder = filter.sortOrder || 'desc';

    results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'downloads':
          comparison = a.downloads - b.downloads;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return results;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: TemplateCategory): WorkflowTemplate[] {
    return this.searchTemplates({ category });
  }

  /**
   * Get featured templates
   */
  getFeaturedTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => t.featured && !t.deprecated)
      .sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get recently added templates
   */
  getRecentTemplates(limit: number = 10): WorkflowTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => !t.deprecated)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get popular templates
   */
  getPopularTemplates(limit: number = 10): WorkflowTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => !t.deprecated)
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  // ------------------------------------------------------------------------
  // Import/Export
  // ------------------------------------------------------------------------

  /**
   * Import a template into the current workflow
   */
  importTemplate(templateId: string, options: TemplateImportOptions = {}): {
    nodes: Node[];
    edges: Edge[];
  } | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // Increment download count
    template.downloads++;
    template.usageCount++;
    template.lastUsed = new Date().toISOString();

    let nodes = [...template.nodes];
    let edges = [...template.edges];

    // Generate new IDs if not preserving
    if (!options.preserveIds) {
      const idMap = new Map<string, string>();

      nodes = nodes.map(node => {
        const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        idMap.set(node.id, newId);
        return {
          ...node,
          id: newId,
        };
      });

      edges = edges.map(edge => ({
        ...edge,
        id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: idMap.get(edge.source) || edge.source,
        target: idMap.get(edge.target) || edge.target,
      }));
    }

    // Apply position offset if provided
    if (options.position) {
      const { x, y } = options.position;
      nodes = nodes.map(node => ({
        ...node,
        position: {
          x: node.position.x + x,
          y: node.position.y + y,
        },
      }));
    }

    return { nodes, edges };
  }

  /**
   * Export current workflow as a template
   */
  exportTemplate(
    nodes: Node[],
    edges: Edge[],
    metadata: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'downloads' | 'usageCount' | 'nodes' | 'edges'>,
    options: TemplateExportOptions = {}
  ): string {
    const template = this.addTemplate({
      ...metadata,
      nodes,
      edges,
    });

    const exportData: any = {
      ...template,
    };

    if (!options.includeStats) {
      delete exportData.downloads;
      delete exportData.usageCount;
      delete exportData.rating;
      delete exportData.reviews;
      delete exportData.lastUsed;
    }

    if (!options.includeMetadata) {
      delete exportData.author;
      delete exportData.createdAt;
      delete exportData.updatedAt;
      delete exportData.isOfficial;
      delete exportData.isCommunity;
      delete exportData.featured;
    }

    // For now, only JSON format is supported
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import template from JSON string
   */
  importTemplateFromJSON(json: string): WorkflowTemplate | null {
    try {
      const data = JSON.parse(json);

      // Validate required fields
      if (!data.name || !data.nodes || !data.edges) {
        return null;
      }

      const template = this.addTemplate({
        name: data.name,
        description: data.description || '',
        category: data.category || 'general',
        tags: data.tags || [],
        author: data.author || { id: 'unknown', name: 'Unknown', verified: false },
        version: data.version || '1.0.0',
        rating: data.rating || 0,
        reviews: data.reviews || 0,
        nodes: data.nodes,
        edges: data.edges,
        variables: data.variables || [],
        requirements: data.requirements || [],
        estimatedCost: data.estimatedCost,
        estimatedDuration: data.estimatedDuration,
        isOfficial: data.isOfficial || false,
        isCommunity: data.isCommunity !== false,
        license: data.license || 'MIT',
        featured: data.featured || false,
        deprecated: data.deprecated || false,
      });

      return template;
    } catch (error) {
      console.error('Failed to import template from JSON:', error);
      return null;
    }
  }

  // ------------------------------------------------------------------------
  // Reviews & Ratings
  // ------------------------------------------------------------------------

  /**
   * Add a review to a template
   */
  addReview(templateId: string, review: Omit<TemplateReview, 'id' | 'templateId' | 'createdAt' | 'helpful'>): TemplateReview | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const fullReview: TemplateReview = {
      ...review,
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      templateId,
      createdAt: new Date().toISOString(),
      helpful: 0,
    };

    const reviews = this.reviews.get(templateId) || [];
    reviews.push(fullReview);
    this.reviews.set(templateId, reviews);

    // Update template rating and review count
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    template.rating = Math.round(avgRating * 10) / 10; // Round to 1 decimal
    template.reviews = reviews.length;

    return fullReview;
  }

  /**
   * Get reviews for a template
   */
  getReviews(templateId: string): TemplateReview[] {
    return this.reviews.get(templateId) || [];
  }

  /**
   * Mark review as helpful
   */
  markReviewHelpful(reviewId: string): boolean {
    for (const reviews of this.reviews.values()) {
      const review = reviews.find(r => r.id === reviewId);
      if (review) {
        review.helpful++;
        return true;
      }
    }
    return false;
  }

  // ------------------------------------------------------------------------
  // Favorites
  // ------------------------------------------------------------------------

  /**
   * Add template to favorites
   */
  addFavorite(templateId: string): boolean {
    if (!this.templates.has(templateId)) return false;
    this.userFavorites.add(templateId);
    return true;
  }

  /**
   * Remove template from favorites
   */
  removeFavorite(templateId: string): boolean {
    return this.userFavorites.delete(templateId);
  }

  /**
   * Check if template is favorited
   */
  isFavorite(templateId: string): boolean {
    return this.userFavorites.has(templateId);
  }

  /**
   * Get all favorite templates
   */
  getFavorites(): WorkflowTemplate[] {
    return Array.from(this.userFavorites)
      .map(id => this.templates.get(id))
      .filter((t): t is WorkflowTemplate => t !== undefined);
  }

  // ------------------------------------------------------------------------
  // Statistics
  // ------------------------------------------------------------------------

  /**
   * Get marketplace statistics
   */
  getStats(): TemplateStats {
    const templates = Array.from(this.templates.values());

    const categoryCounts = templates.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<TemplateCategory, number>);

    const tagCounts = templates.reduce((acc, t) => {
      t.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    return {
      totalTemplates: templates.length,
      totalDownloads: templates.reduce((sum, t) => sum + t.downloads, 0),
      averageRating: templates.reduce((sum, t) => sum + t.rating, 0) / templates.length || 0,
      categoryCounts,
      topTags,
      recentlyAdded: templates.filter(t => new Date(t.createdAt).getTime() > oneWeekAgo).length,
      recentlyUpdated: templates.filter(t => new Date(t.updatedAt).getTime() > oneDayAgo).length,
    };
  }

  // ------------------------------------------------------------------------
  // Default Templates
  // ------------------------------------------------------------------------

  private initializeDefaultTemplates(): void {
    // Template 1: Sequential Code Review Pipeline
    this.addTemplate({
      name: 'Sequential Code Review Pipeline',
      description: 'A comprehensive code review workflow with architecture analysis, security audit, performance review, and final recommendations.',
      category: 'review-critique',
      tags: ['code-review', 'security', 'performance', 'architecture', 'sequential'],
      author: {
        id: 'anthropic',
        name: 'Anthropic',
        verified: true,
        organization: 'Anthropic',
      },
      version: '1.0.0',
      rating: 4.8,
      reviews: 156,
      nodes: [
        {
          id: '1',
          type: 'agent',
          position: { x: 100, y: 100 },
          data: {
            label: 'Architect',
            role: 'architect',
            promptTemplate: 'Analyze the codebase architecture and design patterns.',
            description: 'Architectural analysis and design review',
            config: {
              thinkingMode: 'balanced',
              parallel: false,
            },
            inputs: [],
            outputs: ['architecture-analysis'],
          },
        },
        {
          id: '2',
          type: 'agent',
          position: { x: 100, y: 250 },
          data: {
            label: 'Security Auditor',
            role: 'critic',
            promptTemplate: 'Perform security audit and identify vulnerabilities.',
            description: 'Security vulnerability assessment',
            config: {
              thinkingMode: 'balanced',
              parallel: false,
            },
            inputs: ['architecture-analysis'],
            outputs: ['security-audit'],
          },
        },
        {
          id: '3',
          type: 'agent',
          position: { x: 100, y: 400 },
          data: {
            label: 'Performance Reviewer',
            role: 'critic',
            promptTemplate: 'Analyze performance bottlenecks and optimization opportunities.',
            description: 'Performance analysis and optimization',
            config: {
              thinkingMode: 'balanced',
              parallel: false,
            },
            inputs: ['security-audit'],
            outputs: ['performance-analysis'],
          },
        },
        {
          id: '4',
          type: 'agent',
          position: { x: 100, y: 550 },
          data: {
            label: 'Finalizer',
            role: 'finalizer',
            promptTemplate: 'Synthesize all reviews into actionable recommendations.',
            description: 'Final synthesis and recommendations',
            config: {
              thinkingMode: 'balanced',
              parallel: false,
            },
            inputs: ['architecture-analysis', 'security-audit', 'performance-analysis'],
            outputs: ['final-report'],
          },
        },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2', type: 'smoothstep' },
        { id: 'e2-3', source: '2', target: '3', type: 'smoothstep' },
        { id: 'e3-4', source: '3', target: '4', type: 'smoothstep' },
      ],
      variables: [
        {
          name: 'codebasePath',
          description: 'Path to the codebase to review',
          type: 'string',
          required: true,
          examples: ['/path/to/repo', 'https://github.com/user/repo'],
        },
        {
          name: 'focusAreas',
          description: 'Specific areas to focus on during review',
          type: 'array',
          required: false,
          defaultValue: ['security', 'performance', 'maintainability'],
        },
      ],
      requirements: [
        'Access to codebase repository',
        'Claude Sonnet 4.5 or higher',
      ],
      estimatedCost: { min: 0.50, max: 2.00, currency: 'USD' },
      estimatedDuration: { min: 5, max: 15, unit: 'minutes' },
      isOfficial: true,
      isCommunity: false,
      license: 'MIT',
      featured: true,
      deprecated: false,
    });

    // Template 2: Parallel Research Synthesis
    this.addTemplate({
      name: 'Parallel Research Synthesis',
      description: 'Parallel research workflow with multiple specialists synthesizing findings into a comprehensive report.',
      category: 'research-synthesis',
      tags: ['research', 'parallel', 'synthesis', 'analysis'],
      author: {
        id: 'anthropic',
        name: 'Anthropic',
        verified: true,
        organization: 'Anthropic',
      },
      version: '1.0.0',
      rating: 4.6,
      reviews: 89,
      nodes: [
        {
          id: '1',
          type: 'agent',
          position: { x: 100, y: 100 },
          data: {
            label: 'Technical Researcher',
            role: 'researcher',
            promptTemplate: 'Research technical aspects and implementation details.',
            description: 'Technical research and implementation analysis',
            config: {
              thinkingMode: 'balanced',
              parallel: true,
            },
            inputs: [],
            outputs: ['technical-research'],
          },
        },
        {
          id: '2',
          type: 'agent',
          position: { x: 350, y: 100 },
          data: {
            label: 'Market Researcher',
            role: 'researcher',
            promptTemplate: 'Research market trends and competitive landscape.',
            description: 'Market and competitive analysis',
            config: {
              thinkingMode: 'balanced',
              parallel: true,
            },
            inputs: [],
            outputs: ['market-research'],
          },
        },
        {
          id: '3',
          type: 'agent',
          position: { x: 600, y: 100 },
          data: {
            label: 'Academic Researcher',
            role: 'researcher',
            promptTemplate: 'Research academic literature and theoretical foundations.',
            description: 'Academic literature and theory research',
            config: {
              thinkingMode: 'balanced',
              parallel: true,
            },
            inputs: [],
            outputs: ['academic-research'],
          },
        },
        {
          id: '4',
          type: 'agent',
          position: { x: 350, y: 300 },
          data: {
            label: 'Synthesizer',
            role: 'finalizer',
            promptTemplate: 'Synthesize all research findings into comprehensive report.',
            description: 'Research synthesis and reporting',
            config: {
              thinkingMode: 'extended',
              parallel: false,
            },
            inputs: ['technical-research', 'market-research', 'academic-research'],
            outputs: ['research-report'],
          },
        },
      ],
      edges: [
        { id: 'e1-4', source: '1', target: '4', type: 'smoothstep' },
        { id: 'e2-4', source: '2', target: '4', type: 'smoothstep' },
        { id: 'e3-4', source: '3', target: '4', type: 'smoothstep' },
      ],
      variables: [
        {
          name: 'researchTopic',
          description: 'Topic to research',
          type: 'string',
          required: true,
          examples: ['AI agents', 'blockchain scalability', 'quantum computing'],
        },
        {
          name: 'depth',
          description: 'Research depth level',
          type: 'string',
          required: false,
          defaultValue: 'comprehensive',
          examples: ['overview', 'comprehensive', 'deep-dive'],
        },
      ],
      requirements: [
        'Internet access for research',
        'Claude Sonnet 4.5 or higher',
      ],
      estimatedCost: { min: 1.00, max: 5.00, currency: 'USD' },
      estimatedDuration: { min: 10, max: 30, unit: 'minutes' },
      isOfficial: true,
      isCommunity: false,
      license: 'MIT',
      featured: true,
      deprecated: false,
    });

    // Template 3: Content Creation with Review
    this.addTemplate({
      name: 'Content Creation with Review',
      description: 'Writer creates content, critic reviews it, and editor finalizes the output.',
      category: 'content-creation',
      tags: ['writing', 'content', 'review', 'editing'],
      author: {
        id: 'anthropic',
        name: 'Anthropic',
        verified: true,
        organization: 'Anthropic',
      },
      version: '1.0.0',
      rating: 4.7,
      reviews: 124,
      nodes: [
        {
          id: '1',
          type: 'agent',
          position: { x: 100, y: 100 },
          data: {
            label: 'Writer',
            role: 'writer',
            promptTemplate: 'Write initial content draft based on requirements.',
            description: 'Content creation and drafting',
            config: {
              thinkingMode: 'balanced',
              parallel: false,
            },
            inputs: [],
            outputs: ['draft-content'],
          },
        },
        {
          id: '2',
          type: 'agent',
          position: { x: 350, y: 100 },
          data: {
            label: 'Critic',
            role: 'critic',
            promptTemplate: 'Review content for quality, accuracy, and tone.',
            description: 'Content quality review',
            config: {
              thinkingMode: 'balanced',
              parallel: false,
            },
            inputs: ['draft-content'],
            outputs: ['review-feedback'],
          },
        },
        {
          id: '3',
          type: 'agent',
          position: { x: 600, y: 100 },
          data: {
            label: 'Editor',
            role: 'finalizer',
            promptTemplate: 'Finalize content incorporating review feedback.',
            description: 'Final content editing and polish',
            config: {
              thinkingMode: 'balanced',
              parallel: false,
            },
            inputs: ['draft-content', 'review-feedback'],
            outputs: ['final-content'],
          },
        },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2', type: 'smoothstep' },
        { id: 'e2-3', source: '2', target: '3', type: 'smoothstep' },
      ],
      variables: [
        {
          name: 'topic',
          description: 'Content topic',
          type: 'string',
          required: true,
        },
        {
          name: 'targetAudience',
          description: 'Target audience for the content',
          type: 'string',
          required: false,
          defaultValue: 'general',
        },
        {
          name: 'wordCount',
          description: 'Target word count',
          type: 'number',
          required: false,
          defaultValue: 1000,
        },
      ],
      requirements: ['Claude Sonnet 4.5 or higher'],
      estimatedCost: { min: 0.30, max: 1.50, currency: 'USD' },
      estimatedDuration: { min: 3, max: 10, unit: 'minutes' },
      isOfficial: true,
      isCommunity: false,
      license: 'MIT',
      featured: false,
      deprecated: false,
    });

    // Template 4: Test Generation Pipeline
    this.addTemplate({
      name: 'Test Generation Pipeline',
      description: 'Automated test generation workflow with unit tests, integration tests, and test documentation.',
      category: 'testing-qa',
      tags: ['testing', 'automation', 'qa', 'unit-tests', 'integration-tests'],
      author: {
        id: 'anthropic',
        name: 'Anthropic',
        verified: true,
        organization: 'Anthropic',
      },
      version: '1.0.0',
      rating: 4.5,
      reviews: 67,
      nodes: [
        {
          id: '1',
          type: 'agent',
          position: { x: 100, y: 100 },
          data: {
            label: 'Test Analyzer',
            role: 'architect',
            promptTemplate: 'Analyze code and identify test scenarios.',
            description: 'Test scenario identification and planning',
            config: {
              thinkingMode: 'balanced',
              parallel: false,
            },
            inputs: [],
            outputs: ['test-scenarios'],
          },
        },
        {
          id: '2',
          type: 'agent',
          position: { x: 100, y: 250 },
          data: {
            label: 'Unit Test Generator',
            role: 'tester',
            promptTemplate: 'Generate comprehensive unit tests.',
            description: 'Unit test generation',
            config: {
              thinkingMode: 'balanced',
              parallel: true,
            },
            inputs: ['test-scenarios'],
            outputs: ['unit-tests'],
          },
        },
        {
          id: '3',
          type: 'agent',
          position: { x: 350, y: 250 },
          data: {
            label: 'Integration Test Generator',
            role: 'tester',
            promptTemplate: 'Generate integration tests.',
            description: 'Integration test generation',
            config: {
              thinkingMode: 'balanced',
              parallel: true,
            },
            inputs: ['test-scenarios'],
            outputs: ['integration-tests'],
          },
        },
        {
          id: '4',
          type: 'agent',
          position: { x: 225, y: 400 },
          data: {
            label: 'Test Documenter',
            role: 'finalizer',
            promptTemplate: 'Document test coverage and usage.',
            description: 'Test documentation and coverage report',
            config: {
              thinkingMode: 'minimal',
              parallel: false,
            },
            inputs: ['unit-tests', 'integration-tests'],
            outputs: ['test-documentation'],
          },
        },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2', type: 'smoothstep' },
        { id: 'e1-3', source: '1', target: '3', type: 'smoothstep' },
        { id: 'e2-4', source: '2', target: '4', type: 'smoothstep' },
        { id: 'e3-4', source: '3', target: '4', type: 'smoothstep' },
      ],
      variables: [
        {
          name: 'sourceFiles',
          description: 'Source files to generate tests for',
          type: 'array',
          required: true,
        },
        {
          name: 'testFramework',
          description: 'Testing framework to use',
          type: 'string',
          required: false,
          defaultValue: 'jest',
          examples: ['jest', 'mocha', 'pytest', 'junit'],
        },
      ],
      requirements: [
        'Source code access',
        'Test framework installed',
      ],
      estimatedCost: { min: 0.40, max: 2.50, currency: 'USD' },
      estimatedDuration: { min: 5, max: 20, unit: 'minutes' },
      isOfficial: true,
      isCommunity: false,
      license: 'MIT',
      featured: false,
      deprecated: false,
    });

    // Template 5: Documentation Generator
    this.addTemplate({
      name: 'Documentation Generator',
      description: 'Automated documentation generation with API docs, user guides, and examples.',
      category: 'documentation',
      tags: ['documentation', 'api-docs', 'guides', 'examples'],
      author: {
        id: 'anthropic',
        name: 'Anthropic',
        verified: true,
        organization: 'Anthropic',
      },
      version: '1.0.0',
      rating: 4.4,
      reviews: 52,
      nodes: [
        {
          id: '1',
          type: 'agent',
          position: { x: 100, y: 100 },
          data: {
            label: 'API Documenter',
            role: 'writer',
            promptTemplate: 'Generate API documentation from code.',
            description: 'API documentation generation',
            config: {
              thinkingMode: 'balanced',
              parallel: true,
            },
            inputs: [],
            outputs: ['api-docs'],
          },
        },
        {
          id: '2',
          type: 'agent',
          position: { x: 350, y: 100 },
          data: {
            label: 'Guide Writer',
            role: 'writer',
            promptTemplate: 'Write user guides and tutorials.',
            description: 'User guide and tutorial creation',
            config: {
              thinkingMode: 'balanced',
              parallel: true,
            },
            inputs: [],
            outputs: ['user-guides'],
          },
        },
        {
          id: '3',
          type: 'agent',
          position: { x: 225, y: 250 },
          data: {
            label: 'Example Generator',
            role: 'coder',
            promptTemplate: 'Generate usage examples and code samples.',
            description: 'Code examples and samples',
            config: {
              thinkingMode: 'balanced',
              parallel: false,
            },
            inputs: ['api-docs', 'user-guides'],
            outputs: ['code-examples'],
          },
        },
      ],
      edges: [
        { id: 'e1-3', source: '1', target: '3', type: 'smoothstep' },
        { id: 'e2-3', source: '2', target: '3', type: 'smoothstep' },
      ],
      variables: [
        {
          name: 'projectPath',
          description: 'Path to the project',
          type: 'string',
          required: true,
        },
        {
          name: 'outputFormat',
          description: 'Documentation output format',
          type: 'string',
          required: false,
          defaultValue: 'markdown',
          examples: ['markdown', 'html', 'pdf'],
        },
      ],
      requirements: ['Source code access'],
      estimatedCost: { min: 0.50, max: 3.00, currency: 'USD' },
      estimatedDuration: { min: 5, max: 25, unit: 'minutes' },
      isOfficial: true,
      isCommunity: false,
      license: 'MIT',
      featured: false,
      deprecated: false,
    });
  }
}

// Singleton instance
export const workflowTemplateMarketplace = new WorkflowTemplateMarketplace();
