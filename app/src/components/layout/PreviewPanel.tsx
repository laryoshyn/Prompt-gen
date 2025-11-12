import Editor from '@monaco-editor/react';
import { usePromptStore } from '@/store/promptStore';
import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export function PreviewPanel() {
  const { generatedMarkdown, generateMarkdown, currentPrompt } = usePromptStore();
  const { monacoFontSize } = useSettingsStore();

  // Regenerate markdown whenever the prompt changes
  useEffect(() => {
    if (currentPrompt) {
      generateMarkdown();
    }
  }, [currentPrompt, generateMarkdown]);

  const handleCopyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedMarkdown);
    alert('Copied to clipboard!');
  };

  const handleDownload = () => {
    const blob = new Blob([generatedMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPrompt?.name || 'prompt'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Live Preview</h2>
          <p className="text-sm text-gray-500">Markdown with YAML frontmatter</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyToClipboard}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Copy
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Download
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="markdown"
          value={generatedMarkdown}
          theme="vs-light"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            lineNumbers: 'on',
            wordWrap: 'on',
            fontSize: monacoFontSize,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
