/**
 * Hierarchical Team Builder
 * Visual builder for creating nested team structures
 */

import { useState } from 'react';
import type {
  Team,
  TeamMember,
  TeamMemberRole,
  HierarchyConfig,
} from '@/lib/workflow/hierarchicalTeams';
import type { AgentRole } from '@/types/workflow';
import { hierarchicalTeamsManager, TEAM_TEMPLATES } from '@/lib/workflow/hierarchicalTeams';
import { getAgentTemplate } from '@/lib/workflow/agentTemplates';
import { TemplateMarketplaceDialog } from './TemplateMarketplaceDialog';
import { hierarchicalTeamTemplateMarketplace } from '@/lib/workflow/hierarchicalTeamTemplateMarketplace';
import type { TemplateNestedMember } from '@/lib/workflow/hierarchicalTeamTemplateMarketplace';

// Agent roles from palette, organized by category
const PALETTE_AGENT_ROLES: AgentRole[] = [
  'orchestrator', 'architect',  // Coordination
  'critic', 'red-team', 'tester',  // Quality
  'researcher', 'writer',  // Content
  'coder', 'worker', 'finalizer',  // Execution
];

const ROLE_ICONS: Record<AgentRole, string> = {
  orchestrator: '🎭',
  architect: '🏗️',
  critic: '🔍',
  'red-team': '⚔️',
  researcher: '📚',
  coder: '💻',
  tester: '🧪',
  writer: '✍️',
  worker: '🛠️',
  finalizer: '✅',
};

interface HierarchicalTeamBuilderProps {
  availableAgents: Array<{ id: string; label: string; role: string }>;
  onComplete: (hierarchy: HierarchyConfig) => void;
  onCancel: () => void;
}

export function HierarchicalTeamBuilder({
  availableAgents,
  onComplete,
  onCancel,
}: HierarchicalTeamBuilderProps) {
  const [hierarchyName, setHierarchyName] = useState('');
  const [description, setDescription] = useState('');
  const [maxDepth, setMaxDepth] = useState(3);
  const [maxTeamSize, setMaxTeamSize] = useState(10);

  // Team being built (with recursive nesting)
  const [teamName, setTeamName] = useState('');
  const [leaderId, setLeaderId] = useState('');

  interface NestedMember {
    agentId: string;
    role: TeamMemberRole;
    specialization?: string;
    capabilities: string[];
    subMembers?: NestedMember[];
    expanded?: boolean;
  }

  const [members, setMembers] = useState<NestedMember[]>([]);

  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showCanvasHierarchies, setShowCanvasHierarchies] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  // Track if we're editing an existing hierarchy
  const [editingHierarchyId, setEditingHierarchyId] = useState<string | null>(null);
  const [editingHierarchyCreatedAt, setEditingHierarchyCreatedAt] = useState<number | null>(null);

  const handleAddMember = () => {
    setMembers([...members, {
      agentId: '',
      role: 'member',
      capabilities: [],
      subMembers: [],
      expanded: false,
    }]);
  };

  const handleUpdateMember = (
    path: number[],
    field: string,
    value: string | string[]
  ) => {
    const updated = [...members];
    let target: any = updated;

    // Navigate to the nested member
    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]].subMembers;
    }

    const index = path[path.length - 1];
    (target[index] as any)[field] = value;
    setMembers(updated);
  };

  const handleRemoveMember = (path: number[]) => {
    const updated = [...members];
    let target: any = updated;

    // Navigate to parent
    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]].subMembers;
    }

    const index = path[path.length - 1];
    target.splice(index, 1);
    setMembers(updated);
  };

  const handleAddSubMember = (path: number[]) => {
    const updated = [...members];
    let target: any = updated;

    // Navigate to the member
    for (let i = 0; i < path.length; i++) {
      if (i === path.length - 1) {
        if (!target[path[i]].subMembers) {
          target[path[i]].subMembers = [];
        }
        target[path[i]].subMembers.push({
          agentId: '',
          role: 'member',
          capabilities: [],
          subMembers: [],
          expanded: false,
        });
        target[path[i]].expanded = true;
      } else {
        target = target[path[i]].subMembers;
      }
    }

    setMembers(updated);
  };

  const handleToggleExpand = (path: number[]) => {
    const updated = [...members];
    let target: any = updated;

    // Navigate to the member
    for (let i = 0; i < path.length; i++) {
      if (i === path.length - 1) {
        target[path[i]].expanded = !target[path[i]].expanded;
      } else {
        target = target[path[i]].subMembers;
      }
    }

    setMembers(updated);
  };

  const getCurrentDepth = (path: number[]): number => {
    return path.length;
  };

  // Count total members recursively
  const countTotalMembers = (membersList: NestedMember[]): number => {
    let count = membersList.length;
    membersList.forEach(member => {
      if (member.subMembers && member.subMembers.length > 0) {
        count += countTotalMembers(member.subMembers);
      }
    });
    return count;
  };

  // Count sub-team leaders recursively
  const countLeaders = (membersList: NestedMember[]): number => {
    let count = membersList.filter(m => m.role === 'leader').length;
    membersList.forEach(member => {
      if (member.subMembers && member.subMembers.length > 0) {
        count += countLeaders(member.subMembers);
      }
    });
    return count;
  };

  // Get max depth in hierarchy
  const getActualMaxDepth = (membersList: NestedMember[], currentDepth: number = 1): number => {
    let maxD = currentDepth;
    membersList.forEach(member => {
      if (member.subMembers && member.subMembers.length > 0) {
        maxD = Math.max(maxD, getActualMaxDepth(member.subMembers, currentDepth + 1));
      }
    });
    return maxD;
  };

  // Convert nested members to team members with sub-teams
  const convertNestedMembers = (
    nestedMembers: NestedMember[],
    parentTeamId: string,
    depth: number
  ): TeamMember[] => {
    return nestedMembers.map((m, i) => {
      const memberId = `member-${Date.now()}-${depth}-${i}-${Math.random().toString(36).substr(2, 5)}`;

      // Create sub-team if this member is a leader with sub-members
      let subTeam: Team | undefined;
      let enhancedCapabilities = m.capabilities.length > 0 ? [...m.capabilities] : ['general'];

      if ((m.role === 'leader' || m.role === 'specialist') && m.subMembers && m.subMembers.length > 0) {
        const subTeamId = `team-sub-${Date.now()}-${depth + 1}-${i}`;

        // Add orchestration and delegation capabilities for sub-team leaders
        if (!enhancedCapabilities.includes('team orchestration')) {
          enhancedCapabilities.push('team orchestration');
        }
        if (!enhancedCapabilities.includes('delegation')) {
          enhancedCapabilities.push('delegation');
        }

        // Create the sub-team - the leader will be this member (no duplication)
        // Set leaderId to this member's ID so processTeam can connect properly
        subTeam = {
          id: subTeamId,
          name: `${m.specialization || 'Sub-team'} Team`,
          description: `Level ${depth + 1} team led by ${m.specialization || 'member'}`,
          leaderId: memberId, // Reference to parent member (this member)
          members: [
            // Only add sub-members, not the leader (to avoid duplication)
            ...convertNestedMembers(m.subMembers, subTeamId, depth + 1),
          ],
          parentTeamId,
          depth: depth + 1,
          communicationProtocol: 'cascade' as const,
          decisionMaking: depth + 1 >= maxDepth - 1 ? ('democratic' as const) : ('autocratic' as const),
          createdAt: Date.now(),
        };
      }

      return {
        id: memberId,
        agentId: m.agentId || `placeholder-member-${Date.now()}-${depth}-${i}`,
        role: m.role,
        specialization: m.specialization,
        capabilities: enhancedCapabilities,
        available: true,
        subTeam,
      };
    });
  };

  const handleCreate = () => {
    console.log('=== CREATE HIERARCHY ===');
    console.log('handleCreate called', { hierarchyName, teamName, leaderId, members });
    console.log('Members structure:', JSON.stringify(members, null, 2));

    if (!hierarchyName || !teamName) {
      alert('Please fill in all required fields (Hierarchy Name and Team Name)');
      return;
    }

    try {
      // Generate placeholder agent IDs if no existing agents are selected
      // These will be converted to real nodes by the WorkflowBuilder
      const leaderAgentId = leaderId || `placeholder-leader-${Date.now()}`;
      const leaderMemberId = `leader-${Date.now()}`;
      const rootTeamId = `team-root-${Date.now()}`;

      // Create root team with nested sub-teams
      const rootTeam: Team = {
        id: rootTeamId,
        name: teamName,
        description: 'Root team',
        leaderId: leaderMemberId,
        members: [
          {
            id: leaderMemberId,
            agentId: leaderAgentId,
            role: 'leader',
            capabilities: ['leadership', 'delegation'],
            available: true,
          },
          ...convertNestedMembers(members, rootTeamId, 0),
        ],
        depth: 0,
        communicationProtocol: 'cascade' as const,
        decisionMaking: 'autocratic' as const,
        createdAt: Date.now(),
      };

      console.log('rootTeam created with nested sub-teams:', rootTeam);
      console.log('Root team members:', rootTeam.members.length);
      rootTeam.members.forEach((m, i) => {
        console.log(`Member ${i}:`, m.role, m.specialization, 'has subTeam?', !!m.subTeam);
        if (m.subTeam) {
          console.log(`  Sub-team members:`, m.subTeam.members.length);
        }
      });

      const hierarchy = hierarchicalTeamsManager.createHierarchy({
        name: hierarchyName,
        description,
        rootTeam,
        maxDepth,
        maxTeamSize,
        allowCrossDelegation: true,
        requireApproval: false,
        // Pass editing metadata if we're editing an existing hierarchy
        editingHierarchyId: editingHierarchyId || undefined,
        editingHierarchyCreatedAt: editingHierarchyCreatedAt || undefined,
      });

      console.log('hierarchy created:', hierarchy);

      // If "save as template" is checked, save to marketplace
      if (saveAsTemplate) {
        hierarchicalTeamTemplateMarketplace.addTemplate({
          name: hierarchyName,
          description: description || 'Custom hierarchy template',
          category: 'general' as const,
          tags: ['custom', 'user-created'],
          author: {
            id: 'user',
            name: 'User',
            verified: false,
          },
          version: '1.0.0',
          rating: 0,
          reviews: 0,
          hierarchyName,
          teamName,
          leaderId,
          members: members.map(m => ({
            agentId: m.agentId,
            role: m.role,
            specialization: m.specialization,
            capabilities: m.capabilities,
            subMembers: m.subMembers,
          })),
          maxDepth,
          maxTeamSize,
          variables: [],
          requirements: [],
          isOfficial: false,
          isCommunity: true,
          license: 'MIT' as const,
          featured: false,
          deprecated: false,
        });

        console.log('Template saved to marketplace');
      }

      console.log('calling onComplete...');
      onComplete(hierarchy);

      // Clear editing state after successful creation
      setEditingHierarchyId(null);
      setEditingHierarchyCreatedAt(null);
    } catch (error) {
      console.error('Error creating hierarchy:', error);
      alert(`Error creating hierarchy: ${error}`);
    }
  };

  // Recursive member rendering component
  const renderMember = (member: NestedMember, path: number[], depth: number) => {
    const currentDepth = getCurrentDepth(path);
    const canAddSubMembers = currentDepth < maxDepth && (member.role === 'leader' || member.role === 'specialist');
    const hasSubMembers = member.subMembers && member.subMembers.length > 0;
    const indentClass = `ml-${Math.min(depth * 4, 12)}`;

    return (
      <div key={path.join('-')} className="mb-2">
        <div
          className={`p-3 bg-gray-50 dark:bg-gray-800 rounded border-2 ${
            member.expanded ? 'border-blue-400 dark:border-blue-600' : 'border-gray-200 dark:border-gray-700'
          }`}
          style={{ marginLeft: `${depth * 16}px` }}
        >
          {/* Header with expand/collapse */}
          <div className="flex items-center gap-2 mb-2">
            {(canAddSubMembers || hasSubMembers) && (
              <button
                onClick={() => handleToggleExpand(path)}
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                title={member.expanded ? "Collapse" : "Expand"}
              >
                {member.expanded ? '▼' : '▶'}
              </button>
            )}
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Level {currentDepth} {member.role === 'leader' ? '(Can have sub-team)' : ''}
            </span>
          </div>

          {/* Main fields */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select
              value={member.agentId}
              onChange={(e) => handleUpdateMember(path, 'agentId', e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              title={member.agentId ? "Will use template or clone agent" : "Will create new agent"}
            >
              <option value="">✨ New</option>

              {/* Palette Templates */}
              <option disabled>--- 🎨 Template ---</option>
              {PALETTE_AGENT_ROLES.map(role => {
                const template = getAgentTemplate(role);
                const icon = ROLE_ICONS[role];
                return (
                  <option key={role} value={`template:${role}`}>
                    {icon} {template.name}
                  </option>
                );
              })}

              {/* Canvas Agents - Clone */}
              {availableAgents.length > 0 && <option disabled>--- 📋 Clone ---</option>}
              {availableAgents.map(agent => (
                <option key={`clone-${agent.id}`} value={`clone:${agent.id}`}>
                  📋 {agent.label}
                </option>
              ))}

              {/* Canvas Agents - Link */}
              {availableAgents.length > 0 && <option disabled>--- 🔗 Link ---</option>}
              {availableAgents.map(agent => (
                <option key={`link-${agent.id}`} value={`link:${agent.id}`}>
                  🔗 {agent.label}
                </option>
              ))}
            </select>

            <select
              value={member.role}
              onChange={(e) => handleUpdateMember(path, 'role', e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="member">Member</option>
              <option value="leader">Sub-Team Leader</option>
              <option value="specialist">Specialist</option>
            </select>
          </div>

          <input
            type="text"
            value={member.specialization || ''}
            onChange={(e) => handleUpdateMember(path, 'specialization', e.target.value)}
            placeholder="Specialization (optional)"
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white mb-2"
          />

          <div className="flex gap-2">
            <input
              type="text"
              value={member.capabilities.join(', ')}
              onChange={(e) => handleUpdateMember(
                path,
                'capabilities',
                e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              )}
              placeholder="Capabilities (comma-separated)"
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={() => handleRemoveMember(path)}
              className="px-2 py-1.5 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
            >
              Remove
            </button>
          </div>

          {/* Add sub-member button */}
          {canAddSubMembers && member.expanded && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleAddSubMember(path)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                disabled={currentDepth >= maxDepth}
              >
                + Add Sub-Member (Level {currentDepth + 1})
              </button>
            </div>
          )}
        </div>

        {/* Recursively render sub-members */}
        {member.expanded && member.subMembers && member.subMembers.length > 0 && (
          <div className="mt-2">
            {member.subMembers.map((subMember, subIndex) =>
              renderMember(subMember, [...path, subIndex], depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };


  const handleLoadFromMarketplace = (template: {
    hierarchyName: string;
    description: string;
    teamName: string;
    leaderId: string;
    members: TemplateNestedMember[];
    maxDepth: number;
    maxTeamSize: number;
  }) => {
    setHierarchyName(template.hierarchyName);
    setDescription(template.description);
    setTeamName(template.teamName);
    setLeaderId(template.leaderId);
    setMaxDepth(template.maxDepth);
    setMaxTeamSize(template.maxTeamSize);

    // Convert TemplateNestedMember to NestedMember
    const convertToNestedMember = (tm: TemplateNestedMember): NestedMember => ({
      agentId: tm.agentId,
      role: tm.role,
      specialization: tm.specialization,
      capabilities: tm.capabilities,
      subMembers: tm.subMembers?.map(convertToNestedMember),
      expanded: false,
    });

    setMembers(template.members.map(convertToNestedMember));
    setShowMarketplace(false);
  };

  const getCurrentState = () => ({
    hierarchyName,
    description,
    teamName,
    leaderId,
    members: members.map(m => ({
      agentId: m.agentId,
      role: m.role,
      specialization: m.specialization,
      capabilities: m.capabilities,
      subMembers: m.subMembers?.map(sm => ({
        agentId: sm.agentId,
        role: sm.role,
        specialization: sm.specialization,
        capabilities: sm.capabilities,
      })),
    })) as TemplateNestedMember[],
    maxDepth,
    maxTeamSize,
  });

  const handleLoadFromCanvas = (hierarchyId: string) => {
    // Get all nodes with this hierarchyId
    const hierarchyNodes = availableAgents.filter((agent: any) => agent.hierarchyId === hierarchyId);

    console.log('=== LOADING HIERARCHY FROM CANVAS ===');
    console.log('Total hierarchy nodes:', hierarchyNodes.length);
    console.log('All hierarchy nodes:', hierarchyNodes.map((n: any) => ({
      id: n.id,
      label: n.label,
      isRoot: n.isHierarchyRoot,
      isSubTeamLeader: n.isSubTeamLeader,
      hierarchyChildren: n.hierarchyChildren,
      hierarchyDepth: n.hierarchyDepth,
    })));

    if (hierarchyNodes.length === 0) {
      alert('No nodes found for this hierarchy');
      return;
    }

    // Find root node
    const rootNode = hierarchyNodes.find((n: any) => n.isHierarchyRoot);
    if (!rootNode) {
      alert('Could not find root node for this hierarchy');
      return;
    }

    const rootData = rootNode as any;

    console.log('Root node:', {
      id: rootData.id,
      label: rootData.label,
      hierarchyChildren: rootData.hierarchyChildren,
    });

    // Extract metadata from root node
    setHierarchyName(rootData.hierarchyName || 'Unnamed Hierarchy');
    setDescription(rootData.hierarchyDescription || '');
    setTeamName(rootData.teamName || 'Unnamed Team');
    setMaxDepth(rootData.hierarchyMaxDepth || 3);
    setMaxTeamSize(rootData.hierarchyMaxTeamSize || 10);

    // Track that we're editing an existing hierarchy
    setEditingHierarchyId(hierarchyId);
    setEditingHierarchyCreatedAt(rootData.hierarchyCreatedAt || Date.now());

    // Find the leader - the root node IS the leader
    // Use clone instead of link so we can delete old nodes and create new ones
    setLeaderId(`clone:${rootNode.id}`);

    // Recursively build nested member structure from hierarchy children
    const buildNestedMembers = (parentNodeId: string, depth: number = 0): NestedMember[] => {
      const parentNode = hierarchyNodes.find((n: any) => n.id === parentNodeId);
      if (!parentNode) {
        console.log(`  ${'  '.repeat(depth)}Parent node not found: ${parentNodeId}`);
        return [];
      }

      const parentData = parentNode as any;
      const childIds: string[] = parentData.hierarchyChildren || [];

      console.log(`  ${'  '.repeat(depth)}Building members for parent: ${parentData.label} (${parentNodeId})`);
      console.log(`  ${'  '.repeat(depth)}Children count: ${childIds.length}`, childIds);

      return childIds.map((childId: string) => {
        const childNode = hierarchyNodes.find((n: any) => n.id === childId);
        if (!childNode) {
          console.log(`  ${'  '.repeat(depth + 1)}Child node not found: ${childId}`);
          return null;
        }

        const childData = childNode as any;

        console.log(`  ${'  '.repeat(depth + 1)}Processing child: ${childData.label} (${childId})`);
        console.log(`  ${'  '.repeat(depth + 1)}  Has hierarchyChildren:`, childData.hierarchyChildren);
        console.log(`  ${'  '.repeat(depth + 1)}  Capabilities from node:`, childData.capabilities);

        // Determine role based on metadata
        let role: TeamMemberRole = 'member';
        if (childData.isSubTeamLeader) {
          role = 'leader';
        } else if (childData.specialization) {
          role = 'specialist';
        }

        // Extract capabilities from node data
        const capabilities = childData.capabilities || [];

        // Recursively build sub-members
        const subMembers = (childData.hierarchyChildren && childData.hierarchyChildren.length > 0)
          ? buildNestedMembers(childId, depth + 1)
          : [];

        console.log(`  ${'  '.repeat(depth + 1)}  Built ${subMembers.length} sub-members`);

        return {
          agentId: `clone:${childId}`, // Clone to create new nodes when updating
          role,
          specialization: childData.specialization || childData.label,
          capabilities: Array.isArray(capabilities) ? capabilities : [],
          subMembers: subMembers.length > 0 ? subMembers : undefined,
          expanded: subMembers.length > 0, // Auto-expand if has children
        } as NestedMember;
      }).filter(Boolean) as NestedMember[];
    };

    // Build the members list from root's children
    const reconstructedMembers = buildNestedMembers(rootNode.id, 0);
    setMembers(reconstructedMembers);

    // Close the canvas dialog
    setShowCanvasHierarchies(false);

    console.log('Final reconstructed members:', reconstructedMembers);
    console.log('=== LOADING COMPLETE ===');
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Hierarchical Team Builder
          </h3>
          {editingHierarchyId && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Editing existing hierarchy
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCanvasHierarchies(true)}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            🌳 Load from Canvas
          </button>
          <button
            onClick={() => setShowMarketplace(true)}
            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            🏪 Marketplace
          </button>
        </div>
      </div>

      {/* Quick Start Info */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
        <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
          <strong>💡 How This Works:</strong>
        </p>
        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
          <li><strong>✨ Create new:</strong> Makes fresh agent with default generic settings</li>
          <li><strong>🎨 Template:</strong> Creates agent from palette template (Orchestrator, Critic, etc.)</li>
          <li><strong>📋 Clone:</strong> Creates copy with same properties (new node in hierarchy)</li>
          <li><strong>🔗 Link:</strong> Uses existing canvas node directly (no duplication)</li>
          <li>Linked nodes stay in their original position, only edges are added</li>
        </ul>
      </div>


      <div className="space-y-4">
        {/* Hierarchy config */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Hierarchy Name *
          </label>
          <input
            type="text"
            value={hierarchyName}
            onChange={(e) => setHierarchyName(e.target.value)}
            placeholder="e.g., Development Team Hierarchy"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the team hierarchy..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Depth (nesting levels)
            </label>
            <input
              type="number"
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              min="1"
              max="5"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Team Size
            </label>
            <input
              type="number"
              value={maxTeamSize}
              onChange={(e) => setMaxTeamSize(Number(e.target.value))}
              min="2"
              max="20"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* Root team config */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Root Team Configuration
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team Name *
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g., Engineering Team"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team Leader
              </label>
              <select
                value={leaderId}
                onChange={(e) => setLeaderId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">✨ Create new agent (default settings)</option>

                {/* Palette Templates */}
                <option disabled>--- 🎨 Use template from palette ---</option>
                {PALETTE_AGENT_ROLES.map(role => {
                  const template = getAgentTemplate(role);
                  const icon = ROLE_ICONS[role];
                  return (
                    <option key={role} value={`template:${role}`}>
                      {icon} {template.name}
                    </option>
                  );
                })}

                {/* Canvas Agents - Clone */}
                {availableAgents.length > 0 && <option disabled>--- 📋 Clone from canvas ---</option>}
                {availableAgents.map(agent => (
                  <option key={`clone-${agent.id}`} value={`clone:${agent.id}`}>
                    📋 {agent.label} ({agent.role})
                  </option>
                ))}

                {/* Canvas Agents - Link */}
                {availableAgents.length > 0 && <option disabled>--- 🔗 Link to canvas ---</option>}
                {availableAgents.map(agent => (
                  <option key={`link-${agent.id}`} value={`link:${agent.id}`}>
                    🔗 {agent.label} ({agent.role})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {leaderId ? (
                  leaderId.startsWith('template:') ? (
                    <span className="text-purple-600 dark:text-purple-400">
                      ℹ️ Will create agent from palette template with predefined settings
                    </span>
                  ) : leaderId.startsWith('clone:') ? (
                    <span className="text-blue-600 dark:text-blue-400">
                      ℹ️ Will create a COPY with same properties in new hierarchy structure
                    </span>
                  ) : leaderId.startsWith('link:') ? (
                    <span className="text-green-600 dark:text-green-400">
                      ℹ️ Will use existing canvas node directly (no duplication)
                    </span>
                  ) : (
                    <span className="text-blue-600 dark:text-blue-400">
                      ℹ️ Will create a COPY with same properties in new hierarchy structure
                    </span>
                  )
                ) : (
                  <span>
                    Will create a new agent with orchestrator role and default settings
                  </span>
                )}
              </p>
            </div>

            {/* Team members with nested structure */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Team Members (Root Level)
                </label>
                <button
                  onClick={handleAddMember}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Add Root Member
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {members.map((member, index) => renderMember(member, [index], 0))}

                {members.length === 0 && (
                  <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                    No members added yet. Click "Add Root Member" to start.
                  </div>
                )}
              </div>

              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-200">
                <strong>💡 Tip:</strong> Set role to "Sub-Team Leader" to add sub-members. Click ▶ to expand and add nested agents up to Level {maxDepth}.
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Hierarchy Summary
          </h4>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>• <strong>Max Allowed Depth:</strong> {maxDepth} levels</p>
            <p>• <strong>Actual Depth:</strong> {members.length > 0 ? getActualMaxDepth(members) : 0} levels</p>
            <p>• <strong>Max Team Size:</strong> {maxTeamSize} members per team</p>
            <p>• <strong>Root Team:</strong> {leaderId ? '1 leader' : 'No leader'} + {members.length} root members</p>
            <p>• <strong>Total Agents:</strong> {1 + countTotalMembers(members)} (including leader)</p>
            <p>• <strong>Sub-Team Leaders:</strong> {countLeaders(members)}</p>
          </div>
        </div>

        {/* Save as Template Checkbox */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also save it as a template in Marketplace
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            {editingHierarchyId ? 'Update Hierarchy' : 'Create Hierarchy'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Marketplace Dialog */}
      {showMarketplace && (
        <TemplateMarketplaceDialog
          onClose={() => setShowMarketplace(false)}
          onLoadTemplate={handleLoadFromMarketplace}
          currentState={hierarchyName ? getCurrentState() : undefined}
        />
      )}

      {/* Canvas Hierarchies Dialog */}
      {showCanvasHierarchies && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                Load Hierarchy from Canvas
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Select a hierarchy from the canvas to load it for editing
              </p>
            </div>

            <div className="p-6">
              {availableAgents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg mb-2">No hierarchies on canvas</p>
                  <p className="text-sm">
                    Create a hierarchy first, then you can load it here for editing
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Group nodes by hierarchyId */}
                  {(() => {
                    const hierarchiesMap = new Map<string, Array<{id: string; label: string; role: string}>>();

                    availableAgents.forEach(agent => {
                      const nodeData = agent as any;
                      if (nodeData.hierarchyId) {
                        if (!hierarchiesMap.has(nodeData.hierarchyId)) {
                          hierarchiesMap.set(nodeData.hierarchyId, []);
                        }
                        hierarchiesMap.get(nodeData.hierarchyId)!.push(agent);
                      }
                    });

                    if (hierarchiesMap.size === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <p className="text-lg mb-2">No hierarchies found</p>
                          <p className="text-sm">
                            Create a hierarchy first using this dialog
                          </p>
                        </div>
                      );
                    }

                    return Array.from(hierarchiesMap.entries()).map(([hierarchyId, nodes]) => {
                      const rootNode = nodes.find((n: any) => n.isHierarchyRoot);
                      const hierarchyName = rootNode ? (rootNode as any).hierarchyName : 'Unnamed Hierarchy';
                      const teamName = rootNode ? (rootNode as any).teamName : 'Unnamed Team';

                      return (
                        <div
                          key={hierarchyId}
                          className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
                          onClick={() => handleLoadFromCanvas(hierarchyId)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-1">
                                {hierarchyName}
                              </h4>
                              <p className="text-sm text-gray-600 mb-2">
                                {teamName}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>👥 {nodes.length} agents</span>
                                <span>🏢 {hierarchyId.substring(0, 8)}...</span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLoadFromCanvas(hierarchyId);
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                            >
                              Load for Edit
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowCanvasHierarchies(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
