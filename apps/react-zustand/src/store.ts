import { create } from "zustand";
import { initial, reduce, type Action } from "./model";
const useStore = create(() => initial);
export const current = () => useStore.getState();
export const dispatch = (action: Action) =>
  useStore.setState((state) => reduce(state, action), true);
export const useDocument = () => useStore();
