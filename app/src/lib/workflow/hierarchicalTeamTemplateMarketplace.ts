/**
 * Hierarchical Team Template Marketplace
 *
 * Provides a library of shareable hierarchical team templates with:
 * - Template categorization and tagging
 * - Import/export functionality
 * - Version management
 * - Search and filtering
 * - Community sharing features
 */

import type {
  TeamMemberRole,
  HierarchyConfig,
} from './hierarchicalTeams';

// ============================================================================
// Types
// ============================================================================

/**
 * Nested member structure for template storage
 */
export interface TemplateNestedMember {
  agentId: string;
  role: TeamMemberRole;
  specialization?: string;
  capabilities: string[];
  subMembers?: TemplateNestedMember[];
}

/**
 * Team template structure
 */
export interface HierarchicalTeamTemplate {
  id: string;
  name: string;
  description: string;
  category: TeamTemplateCategory;
  tags: string[];
  author: TemplateAuthor;
  version: string;
  createdAt: string;
  updatedAt: string;
  downloads: number;
  rating: number;
  reviews: number;

  // Team structure
  hierarchyName: string;
  teamName: string;
  leaderId: string;
  members: TemplateNestedMember[];

  // Configuration
  maxDepth: number;
  maxTeamSize: number;
  variables: TemplateVariable[];
  requirements: string[];

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

export type TeamTemplateCategory =
  | 'software-development'
  | 'research-analysis'
  | 'content-production'
  | 'quality-assurance'
  | 'project-management'
  | 'customer-support'
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

export interface TeamTemplateFilter {
  category?: TeamTemplateCategory;
  tags?: string[];
  author?: string;
  search?: string;
  minRating?: number;
  officialOnly?: boolean;
  sortBy?: 'downloads' | 'rating' | 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface TeamTemplateExportOptions {
  includeMetadata?: boolean;
  includeStats?: boolean;
  format?: 'json' | 'yaml';
}

export interface TeamTemplateStats {
  totalTemplates: number;
  totalDownloads: number;
  averageRating: number;
  categoryCounts: Record<TeamTemplateCategory, number>;
  topTags: Array<{ tag: string; count: number }>;
  recentlyAdded: number;
  recentlyUpdated: number;
}

// ============================================================================
// Hierarchical Team Template Marketplace Manager
// ============================================================================

export class HierarchicalTeamTemplateMarketplace {
  private templates: Map<string, HierarchicalTeamTemplate> = new Map();
  private userFavorites: Set<string> = new Set();
  private userTemplates: Set<string> = new Set(); // User-created templates

  constructor() {
    this.initializeDefaultTemplates();
    this.loadFromLocalStorage();
  }

  // ------------------------------------------------------------------------
  // Template Management
  // ------------------------------------------------------------------------

  /**
   * Add a template to the marketplace
   */
  addTemplate(
    template: Omit<
      HierarchicalTeamTemplate,
      'id' | 'createdAt' | 'updatedAt' | 'downloads' | 'usageCount'
    >
  ): HierarchicalTeamTemplate {
    const id = `team-template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const fullTemplate: HierarchicalTeamTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now,
      downloads: 0,
      usageCount: 0,
    };

    this.templates.set(id, fullTemplate);

    // Mark as user template if not official
    if (!fullTemplate.isOfficial) {
      this.userTemplates.add(id);
    }

    this.saveToLocalStorage();
    return fullTemplate;
  }

  /**
   * Update an existing template
   */
  updateTemplate(
    templateId: string,
    updates: Partial<HierarchicalTeamTemplate>
  ): HierarchicalTeamTemplate | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // Don't allow updating official templates
    if (template.isOfficial && !updates.isOfficial) {
      console.warn('Cannot update official template');
      return null;
    }

    const updated = {
      ...template,
      ...updates,
      id: template.id, // Preserve ID
      createdAt: template.createdAt, // Preserve creation time
      updatedAt: new Date().toISOString(),
    };

    this.templates.set(templateId, updated);
    this.saveToLocalStorage();
    return updated;
  }

  /**
   * Delete a template
   */
  deleteTemplate(templateId: string): boolean {
    const template = this.templates.get(templateId);

    // Don't allow deleting official templates
    if (template?.isOfficial) {
      console.warn('Cannot delete official template');
      return false;
    }

    const deleted = this.templates.delete(templateId);
    if (deleted) {
      this.userFavorites.delete(templateId);
      this.userTemplates.delete(templateId);
      this.saveToLocalStorage();
    }
    return deleted;
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(templateId: string): HierarchicalTeamTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get all templates
   */
  getAllTemplates(): HierarchicalTeamTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get user-created templates only
   */
  getUserTemplates(): HierarchicalTeamTemplate[] {
    return Array.from(this.userTemplates)
      .map(id => this.templates.get(id))
      .filter((t): t is HierarchicalTeamTemplate => t !== undefined);
  }

  // ------------------------------------------------------------------------
  // Search & Filter
  // ------------------------------------------------------------------------

  /**
   * Search and filter templates
   */
  searchTemplates(filter: TeamTemplateFilter = {}): HierarchicalTeamTemplate[] {
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
   * Get featured templates
   */
  getFeaturedTemplates(): HierarchicalTeamTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => t.featured && !t.deprecated)
      .sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get recently added templates
   */
  getRecentTemplates(limit: number = 10): HierarchicalTeamTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => !t.deprecated)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get popular templates
   */
  getPopularTemplates(limit: number = 10): HierarchicalTeamTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => !t.deprecated)
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  // ------------------------------------------------------------------------
  // Import/Export
  // ------------------------------------------------------------------------

  /**
   * Import a template and return its structure for loading into builder
   */
  importTemplate(templateId: string): {
    hierarchyName: string;
    description: string;
    teamName: string;
    leaderId: string;
    members: TemplateNestedMember[];
    maxDepth: number;
    maxTeamSize: number;
  } | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // Increment download count
    template.downloads++;
    template.usageCount++;
    template.lastUsed = new Date().toISOString();

    return {
      hierarchyName: template.hierarchyName,
      description: template.description,
      teamName: template.teamName,
      leaderId: template.leaderId,
      members: JSON.parse(JSON.stringify(template.members)), // Deep clone
      maxDepth: template.maxDepth,
      maxTeamSize: template.maxTeamSize,
    };
  }

  /**
   * Export current team as a template
   */
  exportTemplate(
    params: {
      hierarchyName: string;
      description: string;
      teamName: string;
      leaderId: string;
      members: TemplateNestedMember[];
      maxDepth: number;
      maxTeamSize: number;
    },
    metadata: Omit<
      HierarchicalTeamTemplate,
      'id' | 'createdAt' | 'updatedAt' | 'downloads' | 'usageCount' |
      'hierarchyName' | 'teamName' | 'leaderId' | 'members' | 'maxDepth' | 'maxTeamSize'
    >,
    options: TeamTemplateExportOptions = {}
  ): string {
    const template = this.addTemplate({
      ...params,
      ...metadata,
    });

    const exportData: any = { ...template };

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

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import template from JSON string
   */
  importTemplateFromJSON(json: string): HierarchicalTeamTemplate | null {
    try {
      const data = JSON.parse(json);

      // Validate required fields
      if (!data.name || !data.hierarchyName || !data.teamName) {
        return null;
      }

      const template = this.addTemplate({
        name: data.name,
        description: data.description || '',
        category: data.category || 'general',
        tags: data.tags || [],
        author: data.author || { id: 'user', name: 'User', verified: false },
        version: data.version || '1.0.0',
        rating: data.rating || 0,
        reviews: data.reviews || 0,
        hierarchyName: data.hierarchyName,
        teamName: data.teamName,
        leaderId: data.leaderId || '',
        members: data.members || [],
        maxDepth: data.maxDepth || 3,
        maxTeamSize: data.maxTeamSize || 10,
        variables: data.variables || [],
        requirements: data.requirements || [],
        isOfficial: false, // User imports are never official
        isCommunity: true,
        license: data.license || 'MIT',
        featured: false,
        deprecated: data.deprecated || false,
      });

      return template;
    } catch (error) {
      console.error('Failed to import template from JSON:', error);
      return null;
    }
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
    this.saveToLocalStorage();
    return true;
  }

  /**
   * Remove template from favorites
   */
  removeFavorite(templateId: string): boolean {
    const result = this.userFavorites.delete(templateId);
    if (result) {
      this.saveToLocalStorage();
    }
    return result;
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
  getFavorites(): HierarchicalTeamTemplate[] {
    return Array.from(this.userFavorites)
      .map(id => this.templates.get(id))
      .filter((t): t is HierarchicalTeamTemplate => t !== undefined);
  }

  // ------------------------------------------------------------------------
  // Statistics
  // ------------------------------------------------------------------------

  /**
   * Get marketplace statistics
   */
  getStats(): TeamTemplateStats {
    const templates = Array.from(this.templates.values());

    const categoryCounts = templates.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<TeamTemplateCategory, number>);

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
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    return {
      totalTemplates: templates.length,
      totalDownloads: templates.reduce((sum, t) => sum + t.downloads, 0),
      averageRating: templates.reduce((sum, t) => sum + t.rating, 0) / templates.length || 0,
      categoryCounts,
      topTags,
      recentlyAdded: templates.filter(t => new Date(t.createdAt).getTime() > oneWeekAgo).length,
      recentlyUpdated: templates.filter(t => new Date(t.updatedAt).getTime() > oneWeekAgo).length,
    };
  }

  // ------------------------------------------------------------------------
  // Local Storage
  // ------------------------------------------------------------------------

  private saveToLocalStorage(): void {
    try {
      const userTemplatesData = this.getUserTemplates();
      const favoritesData = Array.from(this.userFavorites);

      localStorage.setItem('hierarchical-team-templates', JSON.stringify(userTemplatesData));
      localStorage.setItem('hierarchical-team-favorites', JSON.stringify(favoritesData));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const templatesJson = localStorage.getItem('hierarchical-team-templates');
      const favoritesJson = localStorage.getItem('hierarchical-team-favorites');

      if (templatesJson) {
        const templates: HierarchicalTeamTemplate[] = JSON.parse(templatesJson);
        templates.forEach(template => {
          this.templates.set(template.id, template);
          this.userTemplates.add(template.id);
        });
      }

      if (favoritesJson) {
        const favorites: string[] = JSON.parse(favoritesJson);
        favorites.forEach(id => this.userFavorites.add(id));
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  }

  // ------------------------------------------------------------------------
  // Default Templates
  // ------------------------------------------------------------------------

  private initializeDefaultTemplates(): void {
    // Template 1: Software Development Team
    this.addTemplate({
      name: 'Software Development Team',
      description: 'Complete agile software development team with frontend, backend, and DevOps sub-teams. Includes specialized roles for full-stack development.',
      category: 'software-development',
      tags: ['software', 'agile', 'development', 'engineering', 'full-stack'],
      author: {
        id: 'anthropic',
        name: 'Anthropic',
        verified: true,
        organization: 'Anthropic',
      },
      version: '1.0.0',
      rating: 4.8,
      reviews: 234,
      hierarchyName: 'Software Development Hierarchy',
      teamName: 'Engineering Team',
      leaderId: 'template:orchestrator',
      members: [
        {
          agentId: 'template:architect',
          role: 'leader',
          specialization: 'Frontend',
          capabilities: ['react', 'typescript', 'ui-ux', 'responsive-design'],
          subMembers: [
            {
              agentId: 'template:coder',
              role: 'member',
              specialization: 'UI Components',
              capabilities: ['react', 'css', 'accessibility'],
            },
            {
              agentId: 'template:tester',
              role: 'member',
              specialization: 'Frontend Testing',
              capabilities: ['jest', 'testing-library', 'e2e'],
            },
          ],
        },
        {
          agentId: 'template:architect',
          role: 'leader',
          specialization: 'Backend',
          capabilities: ['nodejs', 'databases', 'api-design', 'microservices'],
          subMembers: [
            {
              agentId: 'template:coder',
              role: 'member',
              specialization: 'API Development',
              capabilities: ['rest-api', 'graphql', 'authentication'],
            },
            {
              agentId: 'template:coder',
              role: 'member',
              specialization: 'Database',
              capabilities: ['sql', 'nosql', 'migrations'],
            },
          ],
        },
        {
          agentId: 'template:worker',
          role: 'specialist',
          specialization: 'DevOps',
          capabilities: ['docker', 'kubernetes', 'ci-cd', 'monitoring'],
        },
      ],
      maxDepth: 3,
      maxTeamSize: 10,
      variables: [
        {
          name: 'projectType',
          description: 'Type of software project',
          type: 'string',
          required: true,
          examples: ['web-app', 'mobile-app', 'api-service', 'full-stack'],
        },
      ],
      requirements: ['GitHub repository access', 'Development environment'],
      isOfficial: true,
      isCommunity: false,
      license: 'MIT',
      featured: true,
      deprecated: false,
    });

    // Template 2: Research Team
    this.addTemplate({
      name: 'Research & Analysis Team',
      description: 'Comprehensive research team with data analysis, literature review, and synthesis capabilities. Perfect for academic or business research projects.',
      category: 'research-analysis',
      tags: ['research', 'analysis', 'data-science', 'literature-review'],
      author: {
        id: 'anthropic',
        name: 'Anthropic',
        verified: true,
        organization: 'Anthropic',
      },
      version: '1.0.0',
      rating: 4.7,
      reviews: 156,
      hierarchyName: 'Research Team Hierarchy',
      teamName: 'Research Division',
      leaderId: 'template:researcher',
      members: [
        {
          agentId: 'template:researcher',
          role: 'leader',
          specialization: 'Data Science',
          capabilities: ['data-analysis', 'statistics', 'machine-learning'],
          subMembers: [
            {
              agentId: 'template:coder',
              role: 'member',
              specialization: 'Data Engineering',
              capabilities: ['data-pipeline', 'etl', 'data-cleaning'],
            },
            {
              agentId: 'template:worker',
              role: 'member',
              specialization: 'Visualization',
              capabilities: ['charts', 'dashboards', 'reporting'],
            },
          ],
        },
        {
          agentId: 'template:researcher',
          role: 'member',
          specialization: 'Literature Review',
          capabilities: ['academic-search', 'citation-analysis', 'synthesis'],
        },
        {
          agentId: 'template:writer',
          role: 'member',
          specialization: 'Documentation',
          capabilities: ['technical-writing', 'reports', 'presentations'],
        },
      ],
      maxDepth: 3,
      maxTeamSize: 10,
      variables: [
        {
          name: 'researchTopic',
          description: 'Main research topic or question',
          type: 'string',
          required: true,
        },
      ],
      requirements: ['Research databases access', 'Data sources'],
      isOfficial: true,
      isCommunity: false,
      license: 'MIT',
      featured: true,
      deprecated: false,
    });

    // Template 3: Content Production Team
    this.addTemplate({
      name: 'Content Production Team',
      description: 'Professional content creation team with writers, editors, and reviewers. Ideal for blogs, documentation, or marketing content.',
      category: 'content-production',
      tags: ['content', 'writing', 'editing', 'marketing'],
      author: {
        id: 'anthropic',
        name: 'Anthropic',
        verified: true,
        organization: 'Anthropic',
      },
      version: '1.0.0',
      rating: 4.6,
      reviews: 98,
      hierarchyName: 'Content Team Hierarchy',
      teamName: 'Content Division',
      leaderId: 'template:orchestrator',
      members: [
        {
          agentId: 'template:writer',
          role: 'member',
          specialization: 'Technical Writer',
          capabilities: ['documentation', 'api-docs', 'tutorials'],
        },
        {
          agentId: 'template:writer',
          role: 'member',
          specialization: 'Marketing Writer',
          capabilities: ['copywriting', 'seo', 'social-media'],
        },
        {
          agentId: 'template:critic',
          role: 'specialist',
          specialization: 'Editor',
          capabilities: ['editing', 'proofreading', 'style-guide'],
        },
      ],
      maxDepth: 2,
      maxTeamSize: 8,
      variables: [
        {
          name: 'contentType',
          description: 'Type of content to produce',
          type: 'string',
          required: true,
          examples: ['blog-post', 'documentation', 'marketing-copy'],
        },
      ],
      requirements: ['Content guidelines', 'Style guide'],
      isOfficial: true,
      isCommunity: false,
      license: 'MIT',
      featured: false,
      deprecated: false,
    });

    // Template 4: QA Testing Team
    this.addTemplate({
      name: 'QA & Testing Team',
      description: 'Comprehensive quality assurance team with unit testing, integration testing, and security testing specialists.',
      category: 'quality-assurance',
      tags: ['qa', 'testing', 'quality', 'automation', 'security'],
      author: {
        id: 'anthropic',
        name: 'Anthropic',
        verified: true,
        organization: 'Anthropic',
      },
      version: '1.0.0',
      rating: 4.5,
      reviews: 72,
      hierarchyName: 'QA Team Hierarchy',
      teamName: 'Quality Assurance',
      leaderId: 'template:tester',
      members: [
        {
          agentId: 'template:tester',
          role: 'member',
          specialization: 'Unit Testing',
          capabilities: ['jest', 'mocha', 'pytest', 'junit'],
        },
        {
          agentId: 'template:tester',
          role: 'member',
          specialization: 'Integration Testing',
          capabilities: ['api-testing', 'database-testing', 'e2e'],
        },
        {
          agentId: 'template:red-team',
          role: 'specialist',
          specialization: 'Security Testing',
          capabilities: ['penetration-testing', 'vulnerability-assessment', 'security-audit'],
        },
      ],
      maxDepth: 2,
      maxTeamSize: 8,
      variables: [],
      requirements: ['Test environment access', 'Testing frameworks'],
      isOfficial: true,
      isCommunity: false,
      license: 'MIT',
      featured: false,
      deprecated: false,
    });
  }
}

// Singleton instance
export const hierarchicalTeamTemplateMarketplace = new HierarchicalTeamTemplateMarketplace();
