export interface NotebookCell {
  id: string;
  type: "code" | "markdown";
  content: string;
  output?: CellOutput;
  isRunning?: boolean;
  executionOrder?: number;
  collapsed?: boolean;
  outputCollapsed?: boolean;
}

export interface CellOutput {
  type: "text" | "html" | "json" | "error" | "dom";
  content: string | Element;
  timestamp: number;
}

export interface Notebook {
  id: string;
  name: string;
  cells: NotebookCell[];
  createdAt: number;
  updatedAt: number;
}

export interface NotebookFile {
  path: string;
  name: string;
  lastModified: number;
}
