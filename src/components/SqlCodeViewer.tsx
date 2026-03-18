import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Editor, { OnMount, useMonaco } from "@monaco-editor/react";
import { useTheme } from "@/components/ThemeProvider";
import { getThemeColorHex } from "@/lib/utils";

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

  const applyMonacoTheme = (monacoInstance: any) => {
    const bgColor = getThemeColorHex("--card");
    const fgColor = getThemeColorHex("--foreground");
    const primary = getThemeColorHex("--primary").replace("#", "");
    const success = getThemeColorHex("--success").replace("#", "");
    const warning = getThemeColorHex("--warning").replace("#", "");
    const info = getThemeColorHex("--info").replace("#", "");
    const mutedFg = getThemeColorHex("--muted-foreground").replace("#", "");

    // Kaba bir parlaklık hesabı: (R*299 + G*587 + B*114) / 1000
    const hex = bgColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const isDarkBg = brightness < 128;

    monacoInstance.editor.defineTheme("vesgen-chameleon", {
      base: isDarkBg ? "vs-dark" : "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: primary, fontStyle: "bold" },
        { token: "string", foreground: success },
        { token: "number", foreground: warning },
        { token: "comment", foreground: mutedFg, fontStyle: "italic" },
        { token: "type", foreground: info },
        { token: "identifier", foreground: fgColor.replace("#", "") },
        { token: "operator", foreground: mutedFg },
      ],
      colors: {
        "editor.background": bgColor,
        "editorSuggestWidget.background": bgColor,
        "editorStickyScroll.background": bgColor,
        "editor.foreground": fgColor,
        ...(isDarkBg
          ? {
            "editorLineNumber.foreground": "#64748b",
            "editor.lineHighlightBackground": "#ffffff0A",
            "editor.selectionBackground": "#ffffff1A",
          }
          : {
            "editorLineNumber.foreground": "#94a3b8",
            "editor.lineHighlightBackground": "#0000000A",
            "editor.selectionBackground": "#0000001A",
          }),
      },
    });

    if (monacoInstance.editor.setTheme) {
      monacoInstance.editor.setTheme("vesgen-chameleon");
    }
  };

  const handleBeforeMount = (monaco: any) => {
    applyMonacoTheme(monaco);
  };

  useEffect(() => {
    if (monaco) {
      setTimeout(() => applyMonacoTheme(monaco), 10);
    }
  }, [monaco, theme]);

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

  return (
    // 🚀 DÜZELTME: rounded-xl ve border kaldırıldı. "rounded-none h-full w-full" yapıldı ki sekme alanıyla tam öpüşsün. 
    // Odaklanma (ring) efekti de iptal edildi çünkü dış kutu zaten şık.
    <div className={`w-full h-full overflow-hidden rounded-none transition-all duration-300`}>
      <Editor
        height="100%"
        defaultLanguage="sql"
        value={code}
        theme={"vesgen-chameleon"}
        onChange={onChange}
        beforeMount={handleBeforeMount}
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