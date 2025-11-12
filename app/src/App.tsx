import { useState } from 'react';
import { SplitView } from './components/layout/SplitView';
import { WorkflowBuilder } from './components/workflow/WorkflowBuilder';

type AppMode = 'prompt' | 'workflow';

function App() {
  const [mode, setMode] = useState<AppMode>('prompt');

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">Prompt Gen</h1>
          <span className="text-sm text-gray-500">2025 Edition</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('prompt')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              mode === 'prompt'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📝 Single Prompt
          </button>
          <button
            onClick={() => setMode('workflow')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              mode === 'workflow'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎭 Multi-Agent Workflow
          </button>
        </div>

        <div className="text-sm text-gray-500">
          Interactive Prompt Engineering Assistant
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'prompt' ? <SplitView /> : <WorkflowBuilder />}
      </div>
    </div>
  );
}

export default App;
