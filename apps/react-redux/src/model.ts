import {
  parseAnnotations,
  validateAnnotations,
  type AnnotationDocument,
} from "raavl/regions";
import {
  createHistory,
  recordHistory,
  undoHistory,
  redoHistory,
} from "raavl/history";
import { annotations } from "./fixture";
export const initial = {
  document: annotations,
  revision: 0,
  selection: null as string | null,
  preferences: { theme: "sage" },
  source: { id: "tone", url: "/fixtures/tone.wav" },
  history: createHistory(annotations),
  rejected: 0,
};
export type State = typeof initial;
export type Action =
  | { type: "commit"; document: AnnotationDocument; baseRevision: number }
  | { type: "undo" | "redo" | "source" }
  | { type: "reload"; document: AnnotationDocument }
  | { type: "select"; id: string | null };
export function reduce(state: State, action: Action): State {
  if (action.type === "commit") {
    if (action.baseRevision !== state.revision)
      return { ...state, rejected: state.rejected + 1 };
    const document = validateAnnotations(action.document, state.source.id);
    return {
      ...state,
      document,
      revision: state.revision + 1,
      history: recordHistory(state.history, document),
    };
  }
  if (action.type === "select") return { ...state, selection: action.id };
  if (action.type === "source") {
    const id = state.source.id === "tone" ? "alternate" : "tone";
    const document = { ...annotations, sourceId: id };
    return {
      ...state,
      source: { id, url: "/fixtures/tone.wav" },
      document,
      revision: state.revision + 1,
      history: createHistory(document),
    };
  }
  if (action.type === "reload") {
    const document = validateAnnotations(action.document, state.source.id);
    return {
      ...state,
      document,
      revision: state.revision + 1,
      history: recordHistory(state.history, document),
    };
  }
  const history =
    action.type === "undo"
      ? undoHistory(state.history)
      : redoHistory(state.history);
  return {
    ...state,
    history,
    document: history.present,
    revision: state.revision + 1,
  };
}
