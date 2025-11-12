/**
 * Hierarchical Teams Pattern
 * Nested sub-agent architecture with delegation chains
 *
 * Pattern: Team Leader → Sub-Teams → Sub-Sub-Teams (recursive)
 *
 * Inspired by CrewAI hierarchical process and enterprise organizational structures
 */

import type { WorkflowState } from '@/types/workflow';

/**
 * Team member role types
 */
export type TeamMemberRole =
  | 'leader' // Team leader, can delegate
  | 'member' // Regular team member
  | 'specialist'; // Specialist for specific tasks

/**
 * Team member
 */
export interface TeamMember {
  id: string;
  agentId: string; // Reference to agent node
  role: TeamMemberRole;
  specialization?: string; // e.g., "frontend", "backend", "database"
  capabilities: string[];

  // Sub-team (for leaders)
  subTeam?: Team;

  // Status
  available: boolean;
  currentTaskId?: string;
}

/**
 * Team structure
 */
export interface Team {
  id: string;
  name: string;
  description?: string;

  // Leadership
  leaderId: string; // Team member ID

  // Members
  members: TeamMember[];

  // Hierarchy
  parentTeamId?: string;
  depth: number; // 0 = root, 1 = first level, etc.

  // Collaboration
  communicationProtocol: 'cascade' | 'broadcast' | 'selective';
  decisionMaking: 'autocratic' | 'democratic' | 'consensus';

  // Metadata
  createdAt: number;
}

/**
 * Task delegation
 */
export interface Delegation {
  id: string;
  taskId: string;

  // From/To
  fromMemberId: string;
  toMemberId: string;
  fromTeamId: string;
  toTeamId?: string; // If delegating to sub-team

  // Task details
  task: unknown;
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline?: number; // Unix timestamp

  // Status
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'rejected';
  result?: unknown;

  // Delegation chain
  delegationChain: string[]; // Member IDs in delegation path

  // Timing
  delegatedAt: number;
  acceptedAt?: number;
  completedAt?: number;
}

/**
 * Team hierarchy configuration
 */
export interface HierarchyConfig {
  id: string;
  name: string;
  description?: string;

  // Root team
  rootTeam: Team;

  // Constraints
  maxDepth: number; // Maximum nesting level
  maxTeamSize: number; // Maximum members per team

  // Delegation rules
  allowCrossDelegation: boolean; // Can delegate across branches?
  requireApproval: boolean; // Do delegations need approval?

  // Communication
  reportingFrequency?: 'real-time' | 'periodic' | 'on-completion';

  // Editing metadata (when loading existing hierarchy for editing)
  editingHierarchyId?: string;
  editingHierarchyCreatedAt?: number;
}

/**
 * Hierarchical Teams Manager
 */
export class HierarchicalTeamsManager {
  private hierarchies: Map<string, HierarchyConfig>;
  private teams: Map<string, Team>;
  private members: Map<string, TeamMember>;
  private delegations: Map<string, Delegation>;

  constructor() {
    this.hierarchies = new Map();
    this.teams = new Map();
    this.members = new Map();
    this.delegations = new Map();
  }

  /**
   * Create team hierarchy
   */
  createHierarchy(config: Omit<HierarchyConfig, 'id'>): HierarchyConfig {
    const hierarchy: HierarchyConfig = {
      ...config,
      id: `hierarchy-${Date.now()}`,
    };

    this.hierarchies.set(hierarchy.id, hierarchy);

    // Register root team and all sub-teams
    this.registerTeamRecursive(hierarchy.rootTeam);

    return hierarchy;
  }

  /**
   * Register team and all sub-teams recursively
   */
  private registerTeamRecursive(team: Team): void {
    this.teams.set(team.id, team);

    // Register members
    team.members.forEach(member => {
      this.members.set(member.id, member);

      // Register sub-team if exists
      if (member.subTeam) {
        this.registerTeamRecursive(member.subTeam);
      }
    });
  }

  /**
   * Create team
   */
  createTeam(params: {
    name: string;
    description?: string;
    leaderId: string;
    members: Omit<TeamMember, 'id'>[];
    parentTeamId?: string;
    communicationProtocol?: Team['communicationProtocol'];
    decisionMaking?: Team['decisionMaking'];
  }): Team {
    const parentTeam = params.parentTeamId ? this.teams.get(params.parentTeamId) : null;
    const depth = parentTeam ? parentTeam.depth + 1 : 0;

    const team: Team = {
      id: `team-${Date.now()}`,
      name: params.name,
      description: params.description,
      leaderId: params.leaderId,
      members: params.members.map(m => ({
        ...m,
        id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        available: true,
      })),
      parentTeamId: params.parentTeamId,
      depth,
      communicationProtocol: params.communicationProtocol || 'cascade',
      decisionMaking: params.decisionMaking || 'autocratic',
      createdAt: Date.now(),
    };

    this.teams.set(team.id, team);
    team.members.forEach(member => this.members.set(member.id, member));

    return team;
  }

  /**
   * Add member to team
   */
  addMember(teamId: string, member: Omit<TeamMember, 'id'>): TeamMember {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }

    const teamMember: TeamMember = {
      ...member,
      id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      available: true,
    };

    team.members.push(teamMember);
    this.members.set(teamMember.id, teamMember);

    return teamMember;
  }

  /**
   * Create sub-team for a member
   */
  createSubTeam(memberId: string, subTeam: Omit<Team, 'id' | 'parentTeamId' | 'depth' | 'createdAt'>): Team {
    const member = this.members.get(memberId);
    if (!member) {
      throw new Error(`Member not found: ${memberId}`);
    }

    if (member.role !== 'leader') {
      throw new Error('Only leaders can have sub-teams');
    }

    const parentTeam = this.findMemberTeam(memberId);
    if (!parentTeam) {
      throw new Error('Parent team not found');
    }

    const team: Team = {
      ...subTeam,
      id: `team-${Date.now()}`,
      parentTeamId: parentTeam.id,
      depth: parentTeam.depth + 1,
      createdAt: Date.now(),
    };

    member.subTeam = team;
    this.registerTeamRecursive(team);

    return team;
  }

  /**
   * Delegate task
   */
  delegate(params: {
    taskId: string;
    task: unknown;
    fromMemberId: string;
    toMemberId: string;
    priority?: Delegation['priority'];
    deadline?: number;
  }): Delegation {
    const fromMember = this.members.get(params.fromMemberId);
    const toMember = this.members.get(params.toMemberId);

    if (!fromMember || !toMember) {
      throw new Error('Member not found');
    }

    const fromTeam = this.findMemberTeam(params.fromMemberId);
    const toTeam = this.findMemberTeam(params.toMemberId);

    if (!fromTeam || !toTeam) {
      throw new Error('Team not found');
    }

    // Build delegation chain
    const chain = this.buildDelegationChain(params.fromMemberId, params.toMemberId);

    const delegation: Delegation = {
      id: `delegation-${Date.now()}`,
      taskId: params.taskId,
      fromMemberId: params.fromMemberId,
      toMemberId: params.toMemberId,
      fromTeamId: fromTeam.id,
      toTeamId: toTeam.id !== fromTeam.id ? toTeam.id : undefined,
      task: params.task,
      priority: params.priority || 'medium',
      deadline: params.deadline,
      status: 'pending',
      delegationChain: chain,
      delegatedAt: Date.now(),
    };

    this.delegations.set(delegation.id, delegation);
    toMember.currentTaskId = params.taskId;

    return delegation;
  }

  /**
   * Build delegation chain between two members
   */
  private buildDelegationChain(fromMemberId: string, toMemberId: string): string[] {
    // For now, simple direct chain
    // In production, calculate actual hierarchy path
    return [fromMemberId, toMemberId];
  }

  /**
   * Accept delegation
   */
  acceptDelegation(delegationId: string): void {
    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new Error(`Delegation not found: ${delegationId}`);
    }

    delegation.status = 'accepted';
    delegation.acceptedAt = Date.now();
  }

  /**
   * Complete delegation
   */
  completeDelegation(delegationId: string, result: unknown): void {
    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new Error(`Delegation not found: ${delegationId}`);
    }

    delegation.status = 'completed';
    delegation.result = result;
    delegation.completedAt = Date.now();

    // Mark member as available
    const member = this.members.get(delegation.toMemberId);
    if (member) {
      member.available = true;
      member.currentTaskId = undefined;
    }
  }

  /**
   * Find team that contains member
   */
  findMemberTeam(memberId: string): Team | null {
    for (const team of this.teams.values()) {
      if (team.members.some(m => m.id === memberId)) {
        return team;
      }
    }
    return null;
  }

  /**
   * Get team hierarchy (tree structure)
   */
  getTeamHierarchy(teamId: string): TeamHierarchyNode | null {
    const team = this.teams.get(teamId);
    if (!team) return null;

    const buildNode = (t: Team): TeamHierarchyNode => {
      const leader = t.members.find(m => m.id === t.leaderId);

      return {
        team: t,
        leader: leader || null,
        subTeams: t.members
          .filter(m => m.subTeam)
          .map(m => buildNode(m.subTeam!)),
      };
    };

    return buildNode(team);
  }

  /**
   * Get all members in hierarchy (recursive)
   */
  getAllMembers(teamId: string): TeamMember[] {
    const team = this.teams.get(teamId);
    if (!team) return [];

    const members: TeamMember[] = [...team.members];

    // Recursively get sub-team members
    team.members.forEach(member => {
      if (member.subTeam) {
        members.push(...this.getAllMembers(member.subTeam.id));
      }
    });

    return members;
  }

  /**
   * Find member by capability
   */
  findMemberByCapability(teamId: string, capability: string): TeamMember | null {
    const allMembers = this.getAllMembers(teamId);
    return allMembers.find(m => m.capabilities.includes(capability)) || null;
  }

  /**
   * Get delegation status
   */
  getDelegation(delegationId: string): Delegation | null {
    return this.delegations.get(delegationId) || null;
  }

  /**
   * Get team delegations
   */
  getTeamDelegations(teamId: string): Delegation[] {
    return Array.from(this.delegations.values()).filter(
      d => d.fromTeamId === teamId || d.toTeamId === teamId
    );
  }

  /**
   * Get member workload
   */
  getMemberWorkload(memberId: string): {
    activeTasks: number;
    completedTasks: number;
    pendingDelegations: number;
  } {
    const delegations = Array.from(this.delegations.values()).filter(
      d => d.toMemberId === memberId
    );

    return {
      activeTasks: delegations.filter(d => d.status === 'in-progress').length,
      completedTasks: delegations.filter(d => d.status === 'completed').length,
      pendingDelegations: delegations.filter(d => d.status === 'pending').length,
    };
  }

  /**
   * Get team
   */
  getTeam(teamId: string): Team | null {
    return this.teams.get(teamId) || null;
  }

  /**
   * Get hierarchy
   */
  getHierarchy(hierarchyId: string): HierarchyConfig | null {
    return this.hierarchies.get(hierarchyId) || null;
  }
}

/**
 * Team hierarchy node (for visualization)
 */
export interface TeamHierarchyNode {
  team: Team;
  leader: TeamMember | null;
  subTeams: TeamHierarchyNode[];
}

/**
 * Singleton instance
 */
export const hierarchicalTeamsManager = new HierarchicalTeamsManager();

/**
 * Common team templates
 */
export const TEAM_TEMPLATES = {
  SOFTWARE_DEV: {
    name: 'Software Development Team',
    description: 'Complete software development team with sub-teams',
    structure: {
      leader: {
        role: 'leader' as const,
        agentId: 'tech-lead',
        capabilities: ['architecture', 'leadership', 'code-review'],
      },
      members: [
        {
          role: 'leader' as const,
          agentId: 'frontend-lead',
          capabilities: ['react', 'typescript', 'ui-ux'],
          specialization: 'frontend',
          hasSubTeam: true,
        },
        {
          role: 'leader' as const,
          agentId: 'backend-lead',
          capabilities: ['nodejs', 'databases', 'api-design'],
          specialization: 'backend',
          hasSubTeam: true,
        },
        {
          role: 'specialist' as const,
          agentId: 'devops',
          capabilities: ['docker', 'kubernetes', 'ci-cd'],
          specialization: 'devops',
        },
      ],
    },
  },

  RESEARCH_TEAM: {
    name: 'Research Team',
    description: 'Research team with specialized sub-teams',
    structure: {
      leader: {
        role: 'leader' as const,
        agentId: 'principal-researcher',
        capabilities: ['research', 'analysis', 'synthesis'],
      },
      members: [
        {
          role: 'member' as const,
          agentId: 'data-researcher',
          capabilities: ['data-analysis', 'statistics'],
          specialization: 'data',
        },
        {
          role: 'member' as const,
          agentId: 'literature-researcher',
          capabilities: ['literature-review', 'writing'],
          specialization: 'literature',
        },
      ],
    },
  },
};
