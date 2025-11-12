/**
 * MCP (Model Context Protocol) Management Panel
 * Manage MCP servers, resources, tools, and memory
 */

import { useState } from 'react';
import type {
  MCPServer,
  MCPServerType,
  MCPResource,
  MCPTool,
  MCPMemoryEntry,
} from '@/lib/workflow/mcpIntegration';
import { mcpIntegration, MCP_SERVER_TEMPLATES } from '@/lib/workflow/mcpIntegration';

type ViewMode = 'servers' | 'resources' | 'tools' | 'memory';

export function MCPPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('servers');
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [showAddServer, setShowAddServer] = useState(false);

  const selectedServer = selectedServerId
    ? servers.find(s => s.id === selectedServerId)
    : null;

  const handleAddServer = (template: keyof typeof MCP_SERVER_TEMPLATES) => {
    const serverTemplate = MCP_SERVER_TEMPLATES[template];
    const server = mcpIntegration.registerServer(serverTemplate);
    setServers([...servers, server]);
    setShowAddServer(false);
  };

  const handleConnect = async (serverId: string) => {
    const success = await mcpIntegration.connectServer(serverId);
    if (success) {
      setServers(servers.map(s =>
        s.id === serverId ? { ...s, status: 'active' as const } : s
      ));
    }
  };

  const handleDisconnect = (serverId: string) => {
    mcpIntegration.disconnectServer(serverId);
    setServers(servers.map(s =>
      s.id === serverId ? { ...s, status: 'inactive' as const } : s
    ));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          MCP Integration
        </h2>

        {/* View mode toggle */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setViewMode('servers')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded ${
              viewMode === 'servers'
                ? 'text-white bg-blue-600'
                : 'text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Servers
          </button>
          <button
            onClick={() => setViewMode('resources')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded ${
              viewMode === 'resources'
                ? 'text-white bg-blue-600'
                : 'text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            }`}
            disabled={!selectedServer}
          >
            Resources
          </button>
          <button
            onClick={() => setViewMode('tools')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded ${
              viewMode === 'tools'
                ? 'text-white bg-blue-600'
                : 'text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            }`}
            disabled={!selectedServer}
          >
            Tools
          </button>
          <button
            onClick={() => setViewMode('memory')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded ${
              viewMode === 'memory'
                ? 'text-white bg-blue-600'
                : 'text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Memory
          </button>
        </div>

        {viewMode === 'servers' && (
          <button
            onClick={() => setShowAddServer(true)}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Add MCP Server
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'servers' && (
          <div className="space-y-3">
            {servers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No MCP servers configured</p>
                <p className="text-xs mt-1">
                  Add servers to enable agent access to tools and resources
                </p>
              </div>
            ) : (
              servers.map(server => (
                <div
                  key={server.id}
                  onClick={() => setSelectedServerId(server.id)}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    selectedServerId === server.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {server.name}
                        </h3>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            server.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : server.status === 'error'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {server.status}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                          {server.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {server.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-2 text-xs text-gray-500 dark:text-gray-400">
                    <div>
                      <span className="font-medium">{server.resources?.length || 0}</span> resources
                    </div>
                    <div>
                      <span className="font-medium">{server.tools?.length || 0}</span> tools
                    </div>
                    <div>
                      <span className="font-medium">{server.prompts?.length || 0}</span> prompts
                    </div>
                  </div>

                  {server.error && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                      Error: {server.error}
                    </div>
                  )}

                  <div className="flex gap-2 mt-2">
                    {server.status === 'active' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDisconnect(server.id);
                        }}
                        className="flex-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnect(server.id);
                        }}
                        className="flex-1 px-2 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {viewMode === 'resources' && selectedServer && (
          <div className="space-y-2">
            {selectedServer.resources && selectedServer.resources.length > 0 ? (
              selectedServer.resources.map((resource, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {resource.name}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {resource.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <div>URI: {resource.uri}</div>
                    {resource.mimeType && <div>Type: {resource.mimeType}</div>}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No resources available</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'tools' && selectedServer && (
          <div className="space-y-2">
            {selectedServer.tools && selectedServer.tools.length > 0 ? (
              selectedServer.tools.map((tool, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                >
                  <div className="mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {tool.name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {tool.description}
                    </p>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div className="font-medium mb-1">Input Parameters:</div>
                    <div className="space-y-1 ml-2">
                      {Object.entries(tool.inputSchema.properties).map(([key, prop]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="font-mono text-blue-600 dark:text-blue-400">
                            {key}
                          </span>
                          {tool.inputSchema.required?.includes(key) && (
                            <span className="text-xs px-1 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded">
                              required
                            </span>
                          )}
                          <span className="text-gray-600 dark:text-gray-400">
                            ({prop.type})
                          </span>
                          {prop.description && (
                            <span className="text-gray-500 dark:text-gray-400">
                              - {prop.description}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No tools available</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'memory' && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">Memory entries will appear here</p>
            <p className="text-xs mt-1">
              Long-term memory persists across workflow executions
            </p>
          </div>
        )}
      </div>

      {/* Add server modal */}
      {showAddServer && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add MCP Server
              </h3>
            </div>

            <div className="p-4 space-y-3">
              {Object.entries(MCP_SERVER_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => handleAddServer(key as keyof typeof MCP_SERVER_TEMPLATES)}
                  className="w-full p-4 text-left bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {template.name}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {template.description}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                      {template.type}
                    </span>
                  </div>

                  <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                    {template.resources && (
                      <span>{template.resources.length} resources</span>
                    )}
                    {template.tools && (
                      <span>{template.tools.length} tools</span>
                    )}
                    <span>{template.transport} transport</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowAddServer(false)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
