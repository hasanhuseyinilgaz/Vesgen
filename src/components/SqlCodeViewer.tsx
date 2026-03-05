import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Editor, { OnMount, useMonaco } from "@monaco-editor/react";
import { useTheme } from "@/components/ThemeProvider";

interface SqlCodeViewerProps {
  code: string;
  wordWrap?: "on" | "off";
  minimapEnabled?: boolean;
  readOnly?: boolean;
  onChange?: (value: string | undefined) => void;
  onEditorMount?: OnMount;
  errorLine?: number | null;
  errorMessage?: string | null;
  dbSchema?: {
    tables: string[];
    views: string[];
    procedures: string[];
    columns: string[];
  };
}

export default function SqlCodeViewer({
  code,
  wordWrap = "on",
  minimapEnabled = false,
  readOnly = false,
  onChange,
  onEditorMount,
  errorLine,
  errorMessage,
  dbSchema = { tables: [], views: [], procedures: [], columns: [] },
}: SqlCodeViewerProps) {
  const { t } = useTranslation();
  const editorRef = useRef<any>(null);
  const monaco = useMonaco();
  const [isFocused, setIsFocused] = useState(false);
  const providerRef = useRef<any>(null);

  const { theme } = useTheme();

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme("app-transparent-light", {
        base: "vs",
        inherit: true,
        rules: [
          { token: "keyword", foreground: "0000ff", fontStyle: "bold" },
          { token: "string", foreground: "a31515" },
          { token: "number", foreground: "098658" },
          { token: "comment", foreground: "008000", fontStyle: "italic" },
          { token: "type", foreground: "2b91af" },
          { token: "identifier", foreground: "001080" },
        ],
        colors: {
          "editor.background": "#00000000",
          "editor.lineHighlightBackground": "#0000000A",
          "editor.selectionBackground": "#0000001A",
        },
      });

      monaco.editor.defineTheme("app-transparent-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "keyword", foreground: "c792ea", fontStyle: "italic" },
          { token: "string", foreground: "ecc48d" },
          { token: "number", foreground: "f78c6c" },
          { token: "comment", foreground: "637777", fontStyle: "italic" },
          { token: "type", foreground: "addb67" },
          { token: "identifier", foreground: "82aaff" },
          { token: "operator", foreground: "c792ea" },
        ],
        colors: {
          "editor.background": "#00000000",
          "editorLineNumber.foreground": "#64748b",
          "editor.lineHighlightBackground": "#ffffff0A",
          "editor.selectionBackground": "#ffffff1A",
        },
      });
    }
  }, [monaco]);

  useEffect(() => {
    if (!monaco) return;
    if (providerRef.current) providerRef.current.dispose();

    providerRef.current = monaco.languages.registerCompletionItemProvider(
      "sql",
      {
        triggerCharacters: [" ", ".", "_", "@"],
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          const suggestions: any[] = [];

          dbSchema.tables.forEach((item) =>
            suggestions.push({
              label: item,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: item,
              detail: t("components.sqlCodeViewer.table"),
              range: range,
              sortText: "01_" + item,
            }),
          );
          dbSchema.views.forEach((item) =>
            suggestions.push({
              label: item,
              kind: monaco.languages.CompletionItemKind.Interface,
              insertText: item,
              detail: t("components.sqlCodeViewer.view"),
              range: range,
              sortText: "02_" + item,
            }),
          );
          dbSchema.procedures.forEach((item) =>
            suggestions.push({
              label: item,
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: item,
              detail: t("components.sqlCodeViewer.storedProcedure"),
              range: range,
              sortText: "03_" + item,
            }),
          );
          dbSchema.columns.forEach((item) =>
            suggestions.push({
              label: item,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: item,
              detail: t("components.sqlCodeViewer.column"),
              range: range,
              sortText: "04_" + item,
            }),
          );

          const sqlKeywords = [
            "SELECT",
            "FROM",
            "WHERE",
            "UPDATE",
            "DELETE",
            "INSERT INTO",
            "JOIN",
            "LEFT JOIN",
            "RIGHT JOIN",
            "GROUP BY",
            "ORDER BY",
            "TOP",
            "COUNT",
            "MAX",
            "MIN",
            "SUM",
            "AS",
            "ON",
            "AND",
            "OR",
            "EXEC",
          ];
          sqlKeywords.forEach((kw) =>
            suggestions.push({
              label: kw,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: kw + " ",
              detail: t("components.sqlCodeViewer.sqlCommand"),
              range: range,
              sortText: "05_" + kw,
            }),
          );

          return { suggestions: suggestions };
        },
      },
    );

    return () => {
      if (providerRef.current) providerRef.current.dispose();
    };
  }, [monaco, dbSchema, t]);

  const handleMount: OnMount = (editor, m) => {
    editorRef.current = editor;
    editor.onDidFocusEditorWidget(() => setIsFocused(true));
    editor.onDidBlurEditorWidget(() => setIsFocused(false));
    if (onEditorMount) onEditorMount(editor, m);
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        scrollbar: { handleMouseWheel: isFocused },
      });
    }
  }, [isFocused]);

  useEffect(() => {
    if (monaco && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model && errorMessage) {
        const line = errorLine && errorLine > 0 ? errorLine : 1;
        monaco.editor.setModelMarkers(model, "sql", [
          {
            startLineNumber: line,
            startColumn: 1,
            endLineNumber: line,
            endColumn: 1000,
            message: errorMessage,
            severity: monaco.MarkerSeverity.Error,
          },
        ]);
        editorRef.current.revealLineInCenterIfOutsideViewport(line);
      } else if (model) {
        monaco.editor.setModelMarkers(model, "sql", []);
      }
    }
  }, [monaco, errorLine, errorMessage, code]);

  const activeMonacoTheme =
    theme === "light" ? "app-transparent-light" : "app-transparent-dark";

  return (
    <div
      className={`w-full h-full overflow-hidden rounded-xl border shadow-sm transition-all duration-300 ${
        isFocused ? "ring-2 ring-primary/30 border-primary" : "border-border"
      } bg-card`}
    >
      <Editor
        height="100%"
        defaultLanguage="sql"
        value={code}
        theme={activeMonacoTheme}
        onChange={onChange}
        onMount={handleMount}
        options={{
          readOnly: readOnly,
          minimap: { enabled: minimapEnabled, scale: 0.75 },
          fontSize: 14,
          wordWrap: wordWrap,
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          automaticLayout: true,
          renderLineHighlight: "all",
          fontFamily: "Consolas, 'Courier New', monospace",
          scrollbar: {
            handleMouseWheel: false,
            alwaysConsumeMouseWheel: false,
          },
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: false },
          wordBasedSuggestions: "off",
        }}
      />
    </div>
  );
}
