/**
 * MCP (Model Context Protocol) Integration
 * Enables vertical agent ↔ tools/memory/resources communication
 *
 * MCP vs A2A:
 * - MCP: Vertical (agent to tools/resources/memory)
 * - A2A: Horizontal (agent to agent peer communication)
 *
 * Based on Anthropic MCP specification (2024-2025)
 */

/**
 * MCP Server types
 */
export type MCPServerType =
  | 'filesystem' // File system access
  | 'database' // Database connections
  | 'api' // External API access
  | 'memory' // Long-term memory
  | 'search' // Search engines
  | 'browser' // Browser automation
  | 'custom'; // Custom tools

/**
 * MCP Resource
 * Represents a resource that agents can access
 */
export interface MCPResource {
  uri: string; // Unique resource identifier (mcp://server/resource)
  name: string;
  description: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

/**
 * MCP Tool
 * Represents a tool that agents can invoke
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
  outputSchema?: {
    type: 'object';
    properties: Record<string, unknown>;
  };
}

/**
 * MCP Prompt
 * Predefined prompt templates from server
 */
export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  template: string;
}

/**
 * MCP Server Configuration
 */
export interface MCPServer {
  id: string;
  name: string;
  type: MCPServerType;
  description: string;

  // Connection
  endpoint?: string; // URL for remote servers
  transport: 'stdio' | 'http' | 'websocket';

  // Capabilities
  resources?: MCPResource[];
  tools?: MCPTool[];
  prompts?: MCPPrompt[];

  // Configuration
  config?: Record<string, unknown>;
  env?: Record<string, string>;

  // Status
  status: 'active' | 'inactive' | 'error';
  lastConnected?: number;
  error?: string;

  // Metadata
  version?: string;
  author?: string;
  tags?: string[];
}

/**
 * MCP Request
 */
export interface MCPRequest {
  id: string;
  type: 'resource' | 'tool' | 'prompt';
  serverId: string;

  // Resource request
  resourceUri?: string;

  // Tool request
  toolName?: string;
  toolArguments?: Record<string, unknown>;

  // Prompt request
  promptName?: string;
  promptArguments?: Record<string, unknown>;

  // Metadata
  requestedBy: string; // Agent ID
  requestedAt: number;
}

/**
 * MCP Response
 */
export interface MCPResponse {
  requestId: string;
  success: boolean;

  // Resource response
  resource?: {
    uri: string;
    content: unknown;
    mimeType: string;
  };

  // Tool response
  toolResult?: {
    output: unknown;
    error?: string;
  };

  // Prompt response
  promptResult?: {
    text: string;
  };

  // Error
  error?: string;

  // Metadata
  respondedAt: number;
  executionTime: number;
}

/**
 * MCP Memory Entry
 */
export interface MCPMemoryEntry {
  id: string;
  key: string;
  value: unknown;
  type: 'short-term' | 'long-term' | 'episodic' | 'semantic';

  // Context
  workflowId?: string;
  agentId?: string;

  // Metadata
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  lastAccessedAt?: number;

  // Expiry
  expiresAt?: number; // Unix timestamp, undefined = never expires

  // Tags for retrieval
  tags?: string[];
  embedding?: number[]; // Vector embedding for semantic search
}

/**
 * MCP Integration Manager
 */
export class MCPIntegrationManager {
  private servers: Map<string, MCPServer>;
  private requests: Map<string, MCPRequest>;
  private responses: Map<string, MCPResponse>;
  private memory: Map<string, MCPMemoryEntry>;

  constructor() {
    this.servers = new Map();
    this.requests = new Map();
    this.responses = new Map();
    this.memory = new Map();
  }

  /**
   * Register MCP server
   */
  registerServer(server: Omit<MCPServer, 'id' | 'status'>): MCPServer {
    const mcpServer: MCPServer = {
      ...server,
      id: `mcp-${server.type}-${Date.now()}`,
      status: 'inactive',
    };

    this.servers.set(mcpServer.id, mcpServer);
    return mcpServer;
  }

  /**
   * Connect to MCP server
   */
  async connectServer(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server) {
      console.error(`Server not found: ${serverId}`);
      return false;
    }

    try {
      // In production, establish actual connection based on transport
      // For now, simulate connection
      server.status = 'active';
      server.lastConnected = Date.now();
      server.error = undefined;

      return true;
    } catch (error) {
      server.status = 'error';
      server.error = error instanceof Error ? error.message : 'Connection failed';
      return false;
    }
  }

  /**
   * Disconnect from MCP server
   */
  disconnectServer(serverId: string): boolean {
    const server = this.servers.get(serverId);
    if (!server) return false;

    server.status = 'inactive';
    return true;
  }

  /**
   * Request resource from MCP server
   */
  async requestResource(params: {
    serverId: string;
    resourceUri: string;
    requestedBy: string;
  }): Promise<MCPResponse> {
    const request: MCPRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'resource',
      serverId: params.serverId,
      resourceUri: params.resourceUri,
      requestedBy: params.requestedBy,
      requestedAt: Date.now(),
    };

    this.requests.set(request.id, request);

    const server = this.servers.get(params.serverId);
    if (!server || server.status !== 'active') {
      const errorResponse: MCPResponse = {
        requestId: request.id,
        success: false,
        error: 'Server not available',
        respondedAt: Date.now(),
        executionTime: 0,
      };
      this.responses.set(request.id, errorResponse);
      return errorResponse;
    }

    const startTime = Date.now();

    try {
      // In production, make actual MCP request
      // For now, simulate response
      const resource = server.resources?.find(r => r.uri === params.resourceUri);

      if (!resource) {
        throw new Error(`Resource not found: ${params.resourceUri}`);
      }

      const response: MCPResponse = {
        requestId: request.id,
        success: true,
        resource: {
          uri: resource.uri,
          content: `Content of ${resource.name}`, // Simulated
          mimeType: resource.mimeType || 'text/plain',
        },
        respondedAt: Date.now(),
        executionTime: Date.now() - startTime,
      };

      this.responses.set(request.id, response);
      return response;
    } catch (error) {
      const errorResponse: MCPResponse = {
        requestId: request.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        respondedAt: Date.now(),
        executionTime: Date.now() - startTime,
      };

      this.responses.set(request.id, errorResponse);
      return errorResponse;
    }
  }

  /**
   * Invoke tool on MCP server
   */
  async invokeTool(params: {
    serverId: string;
    toolName: string;
    toolArguments: Record<string, unknown>;
    requestedBy: string;
  }): Promise<MCPResponse> {
    const request: MCPRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'tool',
      serverId: params.serverId,
      toolName: params.toolName,
      toolArguments: params.toolArguments,
      requestedBy: params.requestedBy,
      requestedAt: Date.now(),
    };

    this.requests.set(request.id, request);

    const server = this.servers.get(params.serverId);
    if (!server || server.status !== 'active') {
      const errorResponse: MCPResponse = {
        requestId: request.id,
        success: false,
        error: 'Server not available',
        respondedAt: Date.now(),
        executionTime: 0,
      };
      this.responses.set(request.id, errorResponse);
      return errorResponse;
    }

    const startTime = Date.now();

    try {
      // In production, invoke actual tool via MCP
      // For now, simulate tool execution
      const tool = server.tools?.find(t => t.name === params.toolName);

      if (!tool) {
        throw new Error(`Tool not found: ${params.toolName}`);
      }

      // Validate arguments against schema
      this.validateToolArguments(params.toolArguments, tool.inputSchema);

      const response: MCPResponse = {
        requestId: request.id,
        success: true,
        toolResult: {
          output: { result: `Tool ${params.toolName} executed successfully` }, // Simulated
        },
        respondedAt: Date.now(),
        executionTime: Date.now() - startTime,
      };

      this.responses.set(request.id, response);
      return response;
    } catch (error) {
      const errorResponse: MCPResponse = {
        requestId: request.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        respondedAt: Date.now(),
        executionTime: Date.now() - startTime,
      };

      this.responses.set(request.id, errorResponse);
      return errorResponse;
    }
  }

  /**
   * Request prompt from MCP server
   */
  async requestPrompt(params: {
    serverId: string;
    promptName: string;
    promptArguments?: Record<string, unknown>;
    requestedBy: string;
  }): Promise<MCPResponse> {
    const request: MCPRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'prompt',
      serverId: params.serverId,
      promptName: params.promptName,
      promptArguments: params.promptArguments,
      requestedBy: params.requestedBy,
      requestedAt: Date.now(),
    };

    this.requests.set(request.id, request);

    const server = this.servers.get(params.serverId);
    if (!server || server.status !== 'active') {
      const errorResponse: MCPResponse = {
        requestId: request.id,
        success: false,
        error: 'Server not available',
        respondedAt: Date.now(),
        executionTime: 0,
      };
      this.responses.set(request.id, errorResponse);
      return errorResponse;
    }

    const startTime = Date.now();

    try {
      const prompt = server.prompts?.find(p => p.name === params.promptName);

      if (!prompt) {
        throw new Error(`Prompt not found: ${params.promptName}`);
      }

      // Interpolate prompt template with arguments
      let text = prompt.template;
      if (params.promptArguments) {
        Object.entries(params.promptArguments).forEach(([key, value]) => {
          text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
        });
      }

      const response: MCPResponse = {
        requestId: request.id,
        success: true,
        promptResult: { text },
        respondedAt: Date.now(),
        executionTime: Date.now() - startTime,
      };

      this.responses.set(request.id, response);
      return response;
    } catch (error) {
      const errorResponse: MCPResponse = {
        requestId: request.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        respondedAt: Date.now(),
        executionTime: Date.now() - startTime,
      };

      this.responses.set(request.id, errorResponse);
      return errorResponse;
    }
  }

  /**
   * Store in MCP memory
   */
  storeMemory(entry: Omit<MCPMemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>): MCPMemoryEntry {
    const memoryEntry: MCPMemoryEntry = {
      ...entry,
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      accessCount: 0,
    };

    this.memory.set(memoryEntry.key, memoryEntry);
    return memoryEntry;
  }

  /**
   * Retrieve from MCP memory
   */
  retrieveMemory(key: string): MCPMemoryEntry | null {
    const entry = this.memory.get(key);
    if (!entry) return null;

    // Check expiry
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();

    return entry;
  }

  /**
   * Search memory by tags
   */
  searchMemoryByTags(tags: string[]): MCPMemoryEntry[] {
    const results: MCPMemoryEntry[] = [];

    for (const entry of this.memory.values()) {
      // Check expiry
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.memory.delete(entry.key);
        continue;
      }

      // Check tags
      if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
        results.push(entry);
      }
    }

    return results;
  }

  /**
   * Delete from memory
   */
  deleteMemory(key: string): boolean {
    return this.memory.delete(key);
  }

  /**
   * Clear expired memory entries
   */
  clearExpiredMemory(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.memory.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.memory.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Get server
   */
  getServer(serverId: string): MCPServer | null {
    return this.servers.get(serverId) || null;
  }

  /**
   * List servers
   */
  listServers(type?: MCPServerType): MCPServer[] {
    const servers = Array.from(this.servers.values());
    return type ? servers.filter(s => s.type === type) : servers;
  }

  /**
   * Get response
   */
  getResponse(requestId: string): MCPResponse | null {
    return this.responses.get(requestId) || null;
  }

  /**
   * Validate tool arguments against schema
   */
  private validateToolArguments(
    args: Record<string, unknown>,
    schema: MCPTool['inputSchema']
  ): void {
    // Validate required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in args)) {
          throw new Error(`Missing required argument: ${field}`);
        }
      }
    }

    // Simple type validation
    for (const [key, value] of Object.entries(args)) {
      const propSchema = schema.properties[key];
      if (!propSchema) continue;

      const actualType = typeof value;
      const expectedType = propSchema.type;

      if (actualType !== expectedType && !(expectedType === 'integer' && actualType === 'number')) {
        throw new Error(`Invalid type for ${key}: expected ${expectedType}, got ${actualType}`);
      }
    }
  }
}

/**
 * Singleton instance
 */
export const mcpIntegration = new MCPIntegrationManager();

/**
 * Common MCP server templates
 */
export const MCP_SERVER_TEMPLATES: Record<string, Omit<MCPServer, 'id' | 'status'>> = {
  FILESYSTEM: {
    name: 'Filesystem Access',
    type: 'filesystem',
    description: 'Access local filesystem for reading/writing files',
    transport: 'stdio',
    resources: [
      {
        uri: 'mcp://filesystem/project',
        name: 'Project Directory',
        description: 'Access project files',
        mimeType: 'inode/directory',
      },
    ],
    tools: [
      {
        name: 'read_file',
        description: 'Read contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to read' },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write contents to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to write' },
            content: { type: 'string', description: 'Content to write' },
          },
          required: ['path', 'content'],
        },
      },
    ],
  },

  MEMORY: {
    name: 'Long-Term Memory',
    type: 'memory',
    description: 'Persistent memory across workflow executions',
    transport: 'http',
    tools: [
      {
        name: 'store',
        description: 'Store value in long-term memory',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Memory key' },
            value: { type: 'string', description: 'Value to store' },
            ttl: { type: 'number', description: 'Time to live in seconds (optional)' },
          },
          required: ['key', 'value'],
        },
      },
      {
        name: 'retrieve',
        description: 'Retrieve value from long-term memory',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Memory key' },
          },
          required: ['key'],
        },
      },
    ],
  },

  WEB_SEARCH: {
    name: 'Web Search',
    type: 'search',
    description: 'Search the web for information',
    transport: 'http',
    tools: [
      {
        name: 'search',
        description: 'Search the web',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            num_results: { type: 'number', description: 'Number of results to return' },
          },
          required: ['query'],
        },
      },
    ],
  },

  DATABASE: {
    name: 'Database Access',
    type: 'database',
    description: 'Query and update database',
    transport: 'http',
    tools: [
      {
        name: 'query',
        description: 'Execute SQL query',
        inputSchema: {
          type: 'object',
          properties: {
            sql: { type: 'string', description: 'SQL query to execute' },
            params: { type: 'object', description: 'Query parameters' },
          },
          required: ['sql'],
        },
      },
    ],
  },
};
