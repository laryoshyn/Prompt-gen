import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FormPanel } from './FormPanel';
import { PreviewPanel } from './PreviewPanel';

export function SplitView() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50">
      <PanelGroup direction="horizontal" autoSaveId="prompt-builder-layout">
        {/* Left Panel: Form */}
        <Panel defaultSize={40} minSize={25} maxSize={60} className="flex flex-col">
          <FormPanel />
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-blue-500 transition-colors cursor-col-resize" />

        {/* Right Panel: Preview */}
        <Panel defaultSize={60} minSize={40} className="flex flex-col">
          <PreviewPanel />
        </Panel>
      </PanelGroup>
    </div>
  );
}
