/**
 * Advanced Artifact Conflict Resolution
 *
 * Handles conflicts when multiple agents modify the same artifact simultaneously.
 * Provides automatic and manual conflict resolution strategies.
 *
 * Features:
 * - Conflict detection (content, schema, metadata)
 * - Resolution strategies (auto-merge, manual, last-write-wins, first-write-wins, etc.)
 * - Three-way merge with common ancestor
 * - Conflict markers for manual resolution
 * - Resolution history tracking
 * - Diff visualization
 */

import type { VersionedArtifact } from './artifactVersioning';

// ============================================================================
// Types
// ============================================================================

export type ConflictType = 'content' | 'schema' | 'metadata' | 'simultaneous-write' | 'type-mismatch';
export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ResolutionStrategy =
  | 'auto-merge'
  | 'manual'
  | 'last-write-wins'
  | 'first-write-wins'
  | 'agent-priority'
  | 'merge-both'
  | 'interactive';

export type MergeResult = 'success' | 'conflict' | 'error';

/**
 * Detected conflict between artifact versions
 */
export interface ArtifactConflict {
  id: string;
  artifactPath: string;
  type: ConflictType;
  severity: ConflictSeverity;
  detectedAt: string;

  // Conflicting versions
  baseVersion?: VersionedArtifact; // Common ancestor
  currentVersion: VersionedArtifact;
  incomingVersion: VersionedArtifact;

  // Conflict details
  conflictRegions: ConflictRegion[];
  affectedFields: string[];

  // Resolution
  resolved: boolean;
  resolution?: ConflictResolution;
  resolvedAt?: string;
  resolvedBy?: string;
}

/**
 * Region of conflict within artifact
 */
export interface ConflictRegion {
  id: string;
  type: 'line' | 'block' | 'field' | 'entire';
  location: {
    start?: number; // Line/char start
    end?: number; // Line/char end
    field?: string; // Field path for structured data
  };
  current: string; // Current content
  incoming: string; // Incoming content
  base?: string; // Original content (if available)
}

/**
 * Resolution of a conflict
 */
export interface ConflictResolution {
  id: string;
  conflictId: string;
  strategy: ResolutionStrategy;
  result: MergeResult;
  resolvedAt: string;
  resolvedBy: string;

  // Resolution details
  mergedContent?: unknown;
  manualEdits?: boolean;
  conflictsRemaining?: number;

  // Decision record
  decisionRationale?: string;
  rejectedVersions: string[]; // Version IDs that were rejected
  acceptedVersions: string[]; // Version IDs that were accepted
}

/**
 * Conflict resolution policy
 */
export interface ResolutionPolicy {
  id: string;
  name: string;
  description: string;
  defaultStrategy: ResolutionStrategy;

  // Strategy selection rules
  rules: {
    conflictType?: ConflictType;
    severity?: ConflictSeverity;
    agentPriority?: Record<string, number>; // Agent ID -> priority
    autoResolveThreshold?: ConflictSeverity; // Auto-resolve conflicts below this severity
    strategy: ResolutionStrategy;
  }[];

  // Notification settings
  notifyOnConflict: boolean;
  notifyAgents?: string[]; // Agent IDs to notify
}

/**
 * Three-way merge configuration
 */
export interface ThreeWayMergeConfig {
  preserveWhitespace: boolean;
  ignoreComments: boolean;
  conflictMarkerStyle: 'standard' | 'diff3' | 'merge';
  autoResolveNonOverlapping: boolean;
}

/**
 * Diff between two artifacts
 */
export interface ArtifactDiff {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  changes: {
    type: 'add' | 'remove' | 'modify';
    location: string | number;
    oldValue?: any;
    newValue?: any;
  }[];
}

// ============================================================================
// Conflict Resolution Manager
// ============================================================================

export class ConflictResolutionManager {
  private conflicts: Map<string, ArtifactConflict> = new Map();
  private resolutions: Map<string, ConflictResolution> = new Map();
  private policies: Map<string, ResolutionPolicy> = new Map();

  // ============================================================================
  // Conflict Detection
  // ============================================================================

  /**
   * Detect conflicts between artifact versions
   */
  detectConflict(params: {
    artifactPath: string;
    currentVersion: VersionedArtifact;
    incomingVersion: VersionedArtifact;
    baseVersion?: VersionedArtifact;
  }): ArtifactConflict | null {
    const { artifactPath, currentVersion, incomingVersion, baseVersion } = params;

    // No conflict if versions are identical
    if (this.areVersionsIdentical(currentVersion, incomingVersion)) {
      return null;
    }

    // Detect conflict type
    const conflictType = this.determineConflictType(currentVersion, incomingVersion);
    const severity = this.calculateSeverity(currentVersion, incomingVersion, conflictType);

    // Find conflict regions
    const conflictRegions = this.findConflictRegions(
      currentVersion,
      incomingVersion,
      baseVersion
    );

    const conflict: ArtifactConflict = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      artifactPath,
      type: conflictType,
      severity,
      detectedAt: new Date().toISOString(),
      baseVersion,
      currentVersion,
      incomingVersion,
      conflictRegions,
      affectedFields: this.getAffectedFields(conflictRegions),
      resolved: false,
    };

    this.conflicts.set(conflict.id, conflict);
    return conflict;
  }

  /**
   * Check if two versions are identical
   */
  private areVersionsIdentical(v1: VersionedArtifact, v2: VersionedArtifact): boolean {
    return JSON.stringify(v1.content) === JSON.stringify(v2.content);
  }

  /**
   * Determine type of conflict
   */
  private determineConflictType(
    current: VersionedArtifact,
    incoming: VersionedArtifact
  ): ConflictType {
    // Check for schema conflicts
    if (current.schema?.id !== incoming.schema?.id) {
      return 'schema';
    }

    // Check for type mismatch
    if (current.contentType !== incoming.contentType) {
      return 'type-mismatch';
    }

    // Check for simultaneous writes (same base version)
    if (current.derivedFrom?.some(id => incoming.derivedFrom?.includes(id))) {
      return 'simultaneous-write';
    }

    // Check for metadata conflicts
    const currentMeta = JSON.stringify(current.metadata);
    const incomingMeta = JSON.stringify(incoming.metadata);
    if (currentMeta !== incomingMeta) {
      return 'metadata';
    }

    return 'content';
  }

  /**
   * Calculate conflict severity
   */
  private calculateSeverity(
    current: VersionedArtifact,
    incoming: VersionedArtifact,
    type: ConflictType
  ): ConflictSeverity {
    // Critical if schema or type mismatch
    if (type === 'schema' || type === 'type-mismatch') {
      return 'critical';
    }

    // High if critical artifacts
    if (current.critical || incoming.critical) {
      return 'high';
    }

    // Calculate similarity
    const similarity = this.calculateSimilarity(current.content, incoming.content);

    if (similarity < 0.3) return 'high';
    if (similarity < 0.6) return 'medium';
    return 'low';
  }

  /**
   * Calculate similarity between two contents (0-1)
   */
  private calculateSimilarity(content1: unknown, content2: unknown): number {
    const str1 = JSON.stringify(content1);
    const str2 = JSON.stringify(content2);

    // Simple Jaccard similarity
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Find conflict regions
   */
  private findConflictRegions(
    current: VersionedArtifact,
    incoming: VersionedArtifact,
    base?: VersionedArtifact
  ): ConflictRegion[] {
    const regions: ConflictRegion[] = [];

    // For structured data (objects)
    if (typeof current.content === 'object' && typeof incoming.content === 'object') {
      const currentObj = current.content as Record<string, any>;
      const incomingObj = incoming.content as Record<string, any>;
      const baseObj = base?.content as Record<string, any> | undefined;

      const allKeys = new Set([
        ...Object.keys(currentObj || {}),
        ...Object.keys(incomingObj || {}),
      ]);

      for (const key of allKeys) {
        const currentVal = currentObj?.[key];
        const incomingVal = incomingObj?.[key];
        const baseVal = baseObj?.[key];

        if (JSON.stringify(currentVal) !== JSON.stringify(incomingVal)) {
          regions.push({
            id: `region-${key}`,
            type: 'field',
            location: { field: key },
            current: JSON.stringify(currentVal, null, 2),
            incoming: JSON.stringify(incomingVal, null, 2),
            base: baseVal ? JSON.stringify(baseVal, null, 2) : undefined,
          });
        }
      }
    } else {
      // For text content
      const currentStr = String(current.content);
      const incomingStr = String(incoming.content);
      const baseStr = base ? String(base.content) : undefined;

      regions.push({
        id: 'region-entire',
        type: 'entire',
        location: { start: 0, end: Math.max(currentStr.length, incomingStr.length) },
        current: currentStr,
        incoming: incomingStr,
        base: baseStr,
      });
    }

    return regions;
  }

  /**
   * Get affected fields from conflict regions
   */
  private getAffectedFields(regions: ConflictRegion[]): string[] {
    return regions
      .filter(r => r.location.field)
      .map(r => r.location.field!);
  }

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  /**
   * Resolve a conflict using specified strategy
   */
  resolveConflict(params: {
    conflictId: string;
    strategy: ResolutionStrategy;
    resolvedBy: string;
    manualContent?: unknown;
    policyId?: string;
  }): ConflictResolution {
    const conflict = this.conflicts.get(params.conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${params.conflictId}`);
    }

    let mergedContent: unknown;
    let result: MergeResult = 'success';
    const acceptedVersions: string[] = [];
    const rejectedVersions: string[] = [];

    switch (params.strategy) {
      case 'last-write-wins':
        mergedContent = conflict.incomingVersion.content;
        acceptedVersions.push(conflict.incomingVersion.id);
        rejectedVersions.push(conflict.currentVersion.id);
        break;

      case 'first-write-wins':
        mergedContent = conflict.currentVersion.content;
        acceptedVersions.push(conflict.currentVersion.id);
        rejectedVersions.push(conflict.incomingVersion.id);
        break;

      case 'manual':
        if (!params.manualContent) {
          throw new Error('Manual content required for manual resolution');
        }
        mergedContent = params.manualContent;
        result = 'success';
        break;

      case 'auto-merge':
        const autoMergeResult = this.autoMerge(conflict);
        mergedContent = autoMergeResult.content;
        result = autoMergeResult.result;
        acceptedVersions.push(...autoMergeResult.acceptedVersions);
        rejectedVersions.push(...autoMergeResult.rejectedVersions);
        break;

      case 'merge-both':
        mergedContent = this.mergeBoth(conflict);
        acceptedVersions.push(conflict.currentVersion.id, conflict.incomingVersion.id);
        break;

      case 'agent-priority':
        // Would need agent priority info
        mergedContent = conflict.incomingVersion.content;
        acceptedVersions.push(conflict.incomingVersion.id);
        rejectedVersions.push(conflict.currentVersion.id);
        break;

      default:
        throw new Error(`Unknown resolution strategy: ${params.strategy}`);
    }

    const resolution: ConflictResolution = {
      id: `resolution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conflictId: params.conflictId,
      strategy: params.strategy,
      result,
      resolvedAt: new Date().toISOString(),
      resolvedBy: params.resolvedBy,
      mergedContent,
      manualEdits: params.strategy === 'manual',
      conflictsRemaining: result === 'conflict' ? conflict.conflictRegions.length : 0,
      acceptedVersions,
      rejectedVersions,
    };

    // Mark conflict as resolved
    conflict.resolved = true;
    conflict.resolution = resolution;
    conflict.resolvedAt = resolution.resolvedAt;
    conflict.resolvedBy = params.resolvedBy;

    this.resolutions.set(resolution.id, resolution);
    return resolution;
  }

  /**
   * Auto-merge non-overlapping changes
   */
  private autoMerge(conflict: ArtifactConflict): {
    content: unknown;
    result: MergeResult;
    acceptedVersions: string[];
    rejectedVersions: string[];
  } {
    const { currentVersion, incomingVersion, baseVersion } = conflict;

    // For structured data
    if (typeof currentVersion.content === 'object' && typeof incomingVersion.content === 'object') {
      const merged: Record<string, any> = {};
      const currentObj = currentVersion.content as Record<string, any>;
      const incomingObj = incomingVersion.content as Record<string, any>;
      const baseObj = baseVersion?.content as Record<string, any> | undefined;

      const allKeys = new Set([
        ...Object.keys(currentObj || {}),
        ...Object.keys(incomingObj || {}),
      ]);

      let hasConflicts = false;

      for (const key of allKeys) {
        const currentVal = currentObj?.[key];
        const incomingVal = incomingObj?.[key];
        const baseVal = baseObj?.[key];

        // No conflict if values are the same
        if (JSON.stringify(currentVal) === JSON.stringify(incomingVal)) {
          merged[key] = currentVal;
          continue;
        }

        // If base exists, check if only one side changed
        if (baseVal !== undefined) {
          const currentChanged = JSON.stringify(currentVal) !== JSON.stringify(baseVal);
          const incomingChanged = JSON.stringify(incomingVal) !== JSON.stringify(baseVal);

          if (currentChanged && !incomingChanged) {
            merged[key] = currentVal;
          } else if (incomingChanged && !currentChanged) {
            merged[key] = incomingVal;
          } else {
            // Both changed - conflict
            hasConflicts = true;
            merged[key] = `<<<<<<< CURRENT\n${JSON.stringify(currentVal, null, 2)}\n=======\n${JSON.stringify(incomingVal, null, 2)}\n>>>>>>> INCOMING`;
          }
        } else {
          // No base - use incoming by default
          merged[key] = incomingVal;
        }
      }

      return {
        content: merged,
        result: hasConflicts ? 'conflict' : 'success',
        acceptedVersions: [currentVersion.id, incomingVersion.id],
        rejectedVersions: [],
      };
    }

    // For text content - use conflict markers
    const currentStr = String(currentVersion.content);
    const incomingStr = String(incomingVersion.content);
    const baseStr = baseVersion ? String(baseVersion.content) : undefined;

    if (baseStr && currentStr !== baseStr && incomingStr !== baseStr && currentStr !== incomingStr) {
      // Three-way conflict
      const merged = `<<<<<<< CURRENT\n${currentStr}\n||||||| BASE\n${baseStr}\n=======\n${incomingStr}\n>>>>>>> INCOMING`;
      return {
        content: merged,
        result: 'conflict',
        acceptedVersions: [],
        rejectedVersions: [],
      };
    }

    // If one side unchanged, use the changed version
    if (baseStr) {
      if (currentStr === baseStr) {
        return {
          content: incomingStr,
          result: 'success',
          acceptedVersions: [incomingVersion.id],
          rejectedVersions: [currentVersion.id],
        };
      }
      if (incomingStr === baseStr) {
        return {
          content: currentStr,
          result: 'success',
          acceptedVersions: [currentVersion.id],
          rejectedVersions: [incomingVersion.id],
        };
      }
    }

    // Default to conflict
    const merged = `<<<<<<< CURRENT\n${currentStr}\n=======\n${incomingStr}\n>>>>>>> INCOMING`;
    return {
      content: merged,
      result: 'conflict',
      acceptedVersions: [],
      rejectedVersions: [],
    };
  }

  /**
   * Merge both versions (concatenate or combine)
   */
  private mergeBoth(conflict: ArtifactConflict): unknown {
    const { currentVersion, incomingVersion } = conflict;

    if (typeof currentVersion.content === 'object' && typeof incomingVersion.content === 'object') {
      return {
        ...currentVersion.content as Record<string, any>,
        ...incomingVersion.content as Record<string, any>,
      };
    }

    return `${currentVersion.content}\n\n${incomingVersion.content}`;
  }

  // ============================================================================
  // Diff & Comparison
  // ============================================================================

  /**
   * Calculate diff between two artifacts
   */
  calculateDiff(v1: VersionedArtifact, v2: VersionedArtifact): ArtifactDiff {
    const diff: ArtifactDiff = {
      added: 0,
      removed: 0,
      modified: 0,
      unchanged: 0,
      changes: [],
    };

    if (typeof v1.content === 'object' && typeof v2.content === 'object') {
      const obj1 = v1.content as Record<string, any>;
      const obj2 = v2.content as Record<string, any>;

      const keys1 = new Set(Object.keys(obj1 || {}));
      const keys2 = new Set(Object.keys(obj2 || {}));

      // Added keys
      for (const key of keys2) {
        if (!keys1.has(key)) {
          diff.added++;
          diff.changes.push({
            type: 'add',
            location: key,
            newValue: obj2[key],
          });
        }
      }

      // Removed keys
      for (const key of keys1) {
        if (!keys2.has(key)) {
          diff.removed++;
          diff.changes.push({
            type: 'remove',
            location: key,
            oldValue: obj1[key],
          });
        }
      }

      // Modified keys
      for (const key of keys1) {
        if (keys2.has(key) && JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
          diff.modified++;
          diff.changes.push({
            type: 'modify',
            location: key,
            oldValue: obj1[key],
            newValue: obj2[key],
          });
        } else if (keys2.has(key)) {
          diff.unchanged++;
        }
      }
    } else {
      // Simple text comparison
      const str1 = String(v1.content);
      const str2 = String(v2.content);

      if (str1 !== str2) {
        diff.modified = 1;
        diff.changes.push({
          type: 'modify',
          location: 0,
          oldValue: str1,
          newValue: str2,
        });
      } else {
        diff.unchanged = 1;
      }
    }

    return diff;
  }

  // ============================================================================
  // Policy Management
  // ============================================================================

  /**
   * Register a resolution policy
   */
  registerPolicy(policy: ResolutionPolicy): void {
    this.policies.set(policy.id, policy);
  }

  /**
   * Get resolution strategy from policy
   */
  getStrategyFromPolicy(policyId: string, conflict: ArtifactConflict): ResolutionStrategy {
    const policy = this.policies.get(policyId);
    if (!policy) return 'manual';

    // Check auto-resolve threshold
    if (policy.rules.find(r => r.autoResolveThreshold)) {
      const rule = policy.rules.find(r => r.autoResolveThreshold)!;
      const severityOrder: ConflictSeverity[] = ['low', 'medium', 'high', 'critical'];
      const conflictSeverityIdx = severityOrder.indexOf(conflict.severity);
      const thresholdIdx = severityOrder.indexOf(rule.autoResolveThreshold!);

      if (conflictSeverityIdx < thresholdIdx) {
        return 'auto-merge';
      }
    }

    // Find matching rule
    for (const rule of policy.rules) {
      if (rule.conflictType && rule.conflictType !== conflict.type) continue;
      if (rule.severity && rule.severity !== conflict.severity) continue;
      return rule.strategy;
    }

    return policy.defaultStrategy;
  }

  // ============================================================================
  // Queries
  // ============================================================================

  /**
   * Get all conflicts
   */
  getAllConflicts(filter?: {
    resolved?: boolean;
    artifactPath?: string;
    severity?: ConflictSeverity;
  }): ArtifactConflict[] {
    let conflicts = Array.from(this.conflicts.values());

    if (filter?.resolved !== undefined) {
      conflicts = conflicts.filter(c => c.resolved === filter.resolved);
    }

    if (filter?.artifactPath) {
      conflicts = conflicts.filter(c => c.artifactPath === filter.artifactPath);
    }

    if (filter?.severity) {
      conflicts = conflicts.filter(c => c.severity === filter.severity);
    }

    return conflicts;
  }

  /**
   * Get conflict by ID
   */
  getConflict(conflictId: string): ArtifactConflict | null {
    return this.conflicts.get(conflictId) || null;
  }

  /**
   * Get resolution by ID
   */
  getResolution(resolutionId: string): ConflictResolution | null {
    return this.resolutions.get(resolutionId) || null;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalConflicts: number;
    resolvedConflicts: number;
    unresolvedConflicts: number;
    conflictsBySeverity: Record<ConflictSeverity, number>;
    conflictsByType: Record<ConflictType, number>;
    resolutionsByStrategy: Record<ResolutionStrategy, number>;
  } {
    const stats = {
      totalConflicts: this.conflicts.size,
      resolvedConflicts: 0,
      unresolvedConflicts: 0,
      conflictsBySeverity: {} as Record<ConflictSeverity, number>,
      conflictsByType: {} as Record<ConflictType, number>,
      resolutionsByStrategy: {} as Record<ResolutionStrategy, number>,
    };

    for (const conflict of this.conflicts.values()) {
      if (conflict.resolved) stats.resolvedConflicts++;
      else stats.unresolvedConflicts++;

      stats.conflictsBySeverity[conflict.severity] =
        (stats.conflictsBySeverity[conflict.severity] || 0) + 1;

      stats.conflictsByType[conflict.type] =
        (stats.conflictsByType[conflict.type] || 0) + 1;
    }

    for (const resolution of this.resolutions.values()) {
      stats.resolutionsByStrategy[resolution.strategy] =
        (stats.resolutionsByStrategy[resolution.strategy] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clear resolved conflicts
   */
  clearResolvedConflicts(): number {
    let cleared = 0;
    for (const [id, conflict] of this.conflicts.entries()) {
      if (conflict.resolved) {
        this.conflicts.delete(id);
        cleared++;
      }
    }
    return cleared;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const conflictResolutionManager = new ConflictResolutionManager();

// ============================================================================
// Default Policies
// ============================================================================

/**
 * Conservative policy - manual resolution for most conflicts
 */
export const CONSERVATIVE_POLICY: ResolutionPolicy = {
  id: 'conservative',
  name: 'Conservative',
  description: 'Manual resolution for most conflicts, auto-resolve only trivial ones',
  defaultStrategy: 'manual',
  rules: [
    {
      severity: 'low',
      autoResolveThreshold: 'medium',
      strategy: 'auto-merge',
    },
    {
      conflictType: 'metadata',
      strategy: 'last-write-wins',
    },
  ],
  notifyOnConflict: true,
};

/**
 * Aggressive policy - auto-resolve when possible
 */
export const AGGRESSIVE_POLICY: ResolutionPolicy = {
  id: 'aggressive',
  name: 'Aggressive',
  description: 'Auto-resolve conflicts when possible, use last-write-wins as fallback',
  defaultStrategy: 'auto-merge',
  rules: [
    {
      conflictType: 'schema',
      strategy: 'manual',
    },
    {
      conflictType: 'type-mismatch',
      strategy: 'manual',
    },
    {
      severity: 'critical',
      strategy: 'manual',
    },
    {
      autoResolveThreshold: 'high',
      strategy: 'auto-merge',
    },
  ],
  notifyOnConflict: false,
};

/**
 * Last-write-wins policy
 */
export const LAST_WRITE_WINS_POLICY: ResolutionPolicy = {
  id: 'last-write-wins',
  name: 'Last Write Wins',
  description: 'Always accept the latest version',
  defaultStrategy: 'last-write-wins',
  rules: [],
  notifyOnConflict: false,
};

// Register default policies
conflictResolutionManager.registerPolicy(CONSERVATIVE_POLICY);
conflictResolutionManager.registerPolicy(AGGRESSIVE_POLICY);
conflictResolutionManager.registerPolicy(LAST_WRITE_WINS_POLICY);
