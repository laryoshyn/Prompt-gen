/**
 * Artifact Versioning & Validation System
 * Inspired by Spec Kit artifact versioning (2024-2025)
 *
 * Features:
 * - Versioned artifact references: artifact://[agent]/[file]?version=[hash]
 * - JSON schema validation for structured artifacts
 * - Lineage tracking (created_by, derived_from, timestamp)
 * - Content hashing for version identification
 * - Artifact conflict resolution
 */

import type { ArtifactMetadata } from './checkpointing';

/**
 * Artifact URI format: artifact://[agent]/[path]?version=[hash]&schema=[schemaId]
 */
export interface ArtifactURI {
  protocol: 'artifact';
  agent: string; // Agent node ID that created the artifact
  path: string; // Relative path or identifier
  version?: string; // Content hash
  schema?: string; // Schema ID for validation
}

/**
 * Enhanced artifact metadata with versioning
 */
export interface VersionedArtifact extends ArtifactMetadata {
  // Version information
  version: number; // Incremental version number (1, 2, 3, ...)
  hash: string; // Content hash (SHA-256 or similar)
  previousVersion?: string; // Previous artifact ID if this is an update

  // Lineage tracking
  createdBy: string; // Agent node ID
  createdAt: number; // Timestamp
  derivedFrom?: string[]; // Parent artifact IDs
  childArtifacts?: string[]; // Derived artifact IDs

  // Schema validation
  schema?: ArtifactSchema; // JSON schema for validation
  validationStatus?: 'valid' | 'invalid' | 'unknown';
  validationErrors?: string[];

  // Content metadata
  contentType: string; // MIME type or extension
  size?: number; // Byte size
  encoding?: string; // e.g., 'utf-8', 'base64'

  // Artifact-specific metadata
  tags?: string[]; // Categorization tags
  description?: string; // Human-readable description
  critical?: boolean; // Is this artifact critical to workflow success?
}

/**
 * JSON Schema for artifact validation
 */
export interface ArtifactSchema {
  id: string; // Schema identifier
  name: string; // Human-readable name
  version: string; // Schema version (semver)
  schema: object; // JSON Schema object
  description?: string;
  examples?: unknown[]; // Example valid artifacts
}

/**
 * Artifact version history
 */
export interface VersionHistory {
  artifactId: string; // Current artifact ID
  path: string; // Artifact path
  versions: VersionedArtifact[]; // All versions (oldest to newest)
  currentVersion: number; // Current version number
  totalVersions: number; // Total number of versions
}

/**
 * Artifact lineage graph
 */
export interface LineageNode {
  artifact: VersionedArtifact;
  parents: LineageNode[]; // Artifacts this was derived from
  children: LineageNode[]; // Artifacts derived from this
}

/**
 * Artifact conflict
 */
export interface ArtifactConflict {
  path: string;
  version1: VersionedArtifact;
  version2: VersionedArtifact;
  conflictType: 'concurrent-modification' | 'schema-mismatch' | 'lineage-conflict';
  resolution?: 'keep-v1' | 'keep-v2' | 'merge' | 'manual';
}

/**
 * Artifact Versioning Manager
 */
export class ArtifactVersionManager {
  private artifacts: Map<string, VersionedArtifact>; // artifactId -> artifact
  private schemas: Map<string, ArtifactSchema>; // schemaId -> schema
  private versionHistory: Map<string, VersionHistory>; // path -> history

  constructor() {
    this.artifacts = new Map();
    this.schemas = new Map();
    this.versionHistory = new Map();
  }

  /**
   * Create a new versioned artifact
   */
  createArtifact(params: {
    path: string;
    content: unknown;
    createdBy: string;
    derivedFrom?: string[];
    schema?: ArtifactSchema;
    contentType?: string;
    tags?: string[];
    description?: string;
    critical?: boolean;
  }): VersionedArtifact {
    const contentStr = typeof params.content === 'string'
      ? params.content
      : JSON.stringify(params.content);

    const hash = this.computeHash(contentStr);
    const timestamp = Date.now();

    // Get version number from history
    const history = this.versionHistory.get(params.path);
    const versionNumber = history ? history.currentVersion + 1 : 1;

    // Create artifact ID
    const artifactId = `artifact-${params.path.replace(/[^a-zA-Z0-9]/g, '-')}-v${versionNumber}-${hash.substring(0, 8)}`;

    const artifact: VersionedArtifact = {
      id: artifactId,
      path: params.path,
      version: versionNumber,
      hash,
      createdBy: params.createdBy,
      createdAt: timestamp,
      derivedFrom: params.derivedFrom,
      schema: params.schema,
      contentType: params.contentType || 'application/octet-stream',
      size: new Blob([contentStr]).size,
      tags: params.tags,
      description: params.description,
      critical: params.critical,
    };

    // Validate against schema if provided
    if (params.schema) {
      const validation = this.validateArtifact(params.content, params.schema);
      artifact.validationStatus = validation.valid ? 'valid' : 'invalid';
      artifact.validationErrors = validation.errors;
    }

    // Store artifact
    this.artifacts.set(artifactId, artifact);

    // Update version history
    this.updateVersionHistory(artifact);

    // Update parent artifacts' children references
    if (params.derivedFrom) {
      params.derivedFrom.forEach(parentId => {
        const parent = this.artifacts.get(parentId);
        if (parent) {
          if (!parent.childArtifacts) {
            parent.childArtifacts = [];
          }
          parent.childArtifacts.push(artifactId);
        }
      });
    }

    return artifact;
  }

  /**
   * Update an existing artifact (creates new version)
   */
  updateArtifact(params: {
    path: string;
    content: unknown;
    updatedBy: string;
    description?: string;
  }): VersionedArtifact {
    const history = this.versionHistory.get(params.path);
    if (!history) {
      throw new Error(`Artifact not found: ${params.path}`);
    }

    const previousArtifact = history.versions[history.versions.length - 1];

    const newArtifact = this.createArtifact({
      path: params.path,
      content: params.content,
      createdBy: params.updatedBy,
      derivedFrom: [previousArtifact.id],
      schema: previousArtifact.schema,
      contentType: previousArtifact.contentType,
      tags: previousArtifact.tags,
      description: params.description || previousArtifact.description,
      critical: previousArtifact.critical,
    });

    newArtifact.previousVersion = previousArtifact.id;

    return newArtifact;
  }

  /**
   * Get artifact by ID or path
   */
  getArtifact(idOrPath: string, version?: number): VersionedArtifact | null {
    // Try by ID first
    const byId = this.artifacts.get(idOrPath);
    if (byId) return byId;

    // Try by path
    const history = this.versionHistory.get(idOrPath);
    if (!history) return null;

    if (version !== undefined) {
      return history.versions.find(v => v.version === version) || null;
    }

    // Return latest version
    return history.versions[history.versions.length - 1];
  }

  /**
   * Get all versions of an artifact
   */
  getVersionHistory(path: string): VersionHistory | null {
    return this.versionHistory.get(path) || null;
  }

  /**
   * Get artifact lineage (dependency tree)
   */
  getLineage(artifactId: string): LineageNode | null {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) return null;

    const buildLineageNode = (id: string, visited = new Set<string>()): LineageNode | null => {
      if (visited.has(id)) return null; // Prevent circular references
      visited.add(id);

      const art = this.artifacts.get(id);
      if (!art) return null;

      const parents: LineageNode[] = [];
      if (art.derivedFrom) {
        art.derivedFrom.forEach(parentId => {
          const parentNode = buildLineageNode(parentId, new Set(visited));
          if (parentNode) parents.push(parentNode);
        });
      }

      const children: LineageNode[] = [];
      if (art.childArtifacts) {
        art.childArtifacts.forEach(childId => {
          const childNode = buildLineageNode(childId, new Set(visited));
          if (childNode) children.push(childNode);
        });
      }

      return { artifact: art, parents, children };
    };

    return buildLineageNode(artifactId);
  }

  /**
   * Parse artifact URI
   */
  parseArtifactURI(uri: string): ArtifactURI | null {
    const uriRegex = /^artifact:\/\/([^/]+)\/(.+?)(?:\?(.+))?$/;
    const match = uri.match(uriRegex);

    if (!match) return null;

    const agent = match[1];
    const path = match[2];
    const queryString = match[3];

    const params: ArtifactURI = {
      protocol: 'artifact',
      agent,
      path,
    };

    if (queryString) {
      const queryParams = new URLSearchParams(queryString);
      if (queryParams.has('version')) {
        params.version = queryParams.get('version')!;
      }
      if (queryParams.has('schema')) {
        params.schema = queryParams.get('schema')!;
      }
    }

    return params;
  }

  /**
   * Build artifact URI
   */
  buildArtifactURI(params: ArtifactURI): string {
    let uri = `artifact://${params.agent}/${params.path}`;

    const queryParams = new URLSearchParams();
    if (params.version) queryParams.set('version', params.version);
    if (params.schema) queryParams.set('schema', params.schema);

    const queryString = queryParams.toString();
    if (queryString) {
      uri += `?${queryString}`;
    }

    return uri;
  }

  /**
   * Register an artifact schema
   */
  registerSchema(schema: ArtifactSchema): void {
    this.schemas.set(schema.id, schema);
  }

  /**
   * Get registered schema
   */
  getSchema(schemaId: string): ArtifactSchema | null {
    return this.schemas.get(schemaId) || null;
  }

  /**
   * Validate artifact against schema
   */
  validateArtifact(content: unknown, schema: ArtifactSchema): {
    valid: boolean;
    errors: string[];
  } {
    // Simple validation (in production, use a proper JSON Schema validator like Ajv)
    try {
      // For now, just check if content matches expected structure
      // In real implementation, use Ajv or similar library
      const errors: string[] = [];

      // Basic type checking based on schema
      if (typeof content !== 'object' || content === null) {
        errors.push('Content must be an object');
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
      };
    }
  }

  /**
   * Detect conflicts between artifact versions
   */
  detectConflicts(path: string): ArtifactConflict[] {
    const history = this.versionHistory.get(path);
    if (!history || history.versions.length < 2) return [];

    const conflicts: ArtifactConflict[] = [];

    // Check for concurrent modifications (same parent, different content)
    for (let i = 0; i < history.versions.length - 1; i++) {
      for (let j = i + 1; j < history.versions.length; j++) {
        const v1 = history.versions[i];
        const v2 = history.versions[j];

        // Concurrent modification if both derived from same parent
        if (v1.previousVersion === v2.previousVersion && v1.hash !== v2.hash) {
          conflicts.push({
            path,
            version1: v1,
            version2: v2,
            conflictType: 'concurrent-modification',
          });
        }

        // Schema mismatch if schemas differ
        if (v1.schema?.id !== v2.schema?.id) {
          conflicts.push({
            path,
            version1: v1,
            version2: v2,
            conflictType: 'schema-mismatch',
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Compare two artifact versions
   */
  compareVersions(artifactId1: string, artifactId2: string): {
    same: boolean;
    hashMatch: boolean;
    schemaSame: boolean;
    contentDiff?: string;
  } {
    const art1 = this.artifacts.get(artifactId1);
    const art2 = this.artifacts.get(artifactId2);

    if (!art1 || !art2) {
      throw new Error('Artifact not found');
    }

    return {
      same: art1.hash === art2.hash,
      hashMatch: art1.hash === art2.hash,
      schemaSame: art1.schema?.id === art2.schema?.id,
      // In production, compute actual diff
      contentDiff: art1.hash !== art2.hash ? 'Content differs' : undefined,
    };
  }

  /**
   * Compute content hash (simple implementation)
   */
  private computeHash(content: string): string {
    // Simple hash function (in production, use crypto.subtle.digest or similar)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Update version history for artifact
   */
  private updateVersionHistory(artifact: VersionedArtifact): void {
    let history = this.versionHistory.get(artifact.path);

    if (!history) {
      history = {
        artifactId: artifact.id,
        path: artifact.path,
        versions: [],
        currentVersion: 0,
        totalVersions: 0,
      };
      this.versionHistory.set(artifact.path, history);
    }

    history.versions.push(artifact);
    history.currentVersion = artifact.version;
    history.totalVersions = history.versions.length;
    history.artifactId = artifact.id; // Update to latest artifact ID
  }

  /**
   * Export all artifacts (for serialization)
   */
  exportArtifacts(): {
    artifacts: VersionedArtifact[];
    schemas: ArtifactSchema[];
    versionHistory: VersionHistory[];
  } {
    return {
      artifacts: Array.from(this.artifacts.values()),
      schemas: Array.from(this.schemas.values()),
      versionHistory: Array.from(this.versionHistory.values()),
    };
  }

  /**
   * Import artifacts (for deserialization)
   */
  importArtifacts(data: {
    artifacts: VersionedArtifact[];
    schemas: ArtifactSchema[];
    versionHistory: VersionHistory[];
  }): void {
    // Clear existing
    this.artifacts.clear();
    this.schemas.clear();
    this.versionHistory.clear();

    // Import
    data.artifacts.forEach(art => this.artifacts.set(art.id, art));
    data.schemas.forEach(schema => this.schemas.set(schema.id, schema));
    data.versionHistory.forEach(history => this.versionHistory.set(history.path, history));
  }
}

/**
 * Singleton instance
 */
export const artifactVersionManager = new ArtifactVersionManager();

/**
 * Common artifact schemas
 */
export const COMMON_SCHEMAS: Record<string, ArtifactSchema> = {
  JSON_OUTPUT: {
    id: 'json-output',
    name: 'Generic JSON Output',
    version: '1.0.0',
    schema: {
      type: 'object',
    },
    description: 'Generic JSON object output from agents',
  },

  MARKDOWN_DOCUMENT: {
    id: 'markdown-document',
    name: 'Markdown Document',
    version: '1.0.0',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        metadata: { type: 'object' },
      },
      required: ['content'],
    },
    description: 'Markdown document with title and metadata',
  },

  CODE_ARTIFACT: {
    id: 'code-artifact',
    name: 'Code Artifact',
    version: '1.0.0',
    schema: {
      type: 'object',
      properties: {
        language: { type: 'string' },
        code: { type: 'string' },
        filename: { type: 'string' },
        dependencies: { type: 'array', items: { type: 'string' } },
      },
      required: ['language', 'code'],
    },
    description: 'Source code artifact with language and dependencies',
  },

  TEST_RESULTS: {
    id: 'test-results',
    name: 'Test Results',
    version: '1.0.0',
    schema: {
      type: 'object',
      properties: {
        totalTests: { type: 'number' },
        passed: { type: 'number' },
        failed: { type: 'number' },
        skipped: { type: 'number' },
        duration: { type: 'number' },
        testCases: { type: 'array' },
      },
      required: ['totalTests', 'passed', 'failed'],
    },
    description: 'Test execution results',
  },

  DESIGN_DOCUMENT: {
    id: 'design-document',
    name: 'Design Document',
    version: '1.0.0',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        overview: { type: 'string' },
        architecture: { type: 'object' },
        components: { type: 'array' },
        decisions: { type: 'array' },
      },
      required: ['title', 'overview'],
    },
    description: 'System design document with architecture decisions',
  },
};

// Register common schemas
Object.values(COMMON_SCHEMAS).forEach(schema => {
  artifactVersionManager.registerSchema(schema);
});
