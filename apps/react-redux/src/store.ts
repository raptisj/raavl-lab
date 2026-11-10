import { configureStore } from "@reduxjs/toolkit";
import { useSyncExternalStore } from "react";
import { initial, reduce, type Action, type State } from "./model";
export const store = configureStore({
  reducer: (state: State = initial, action: any) =>
    action.type === "lab/edit" ? reduce(state, action.payload) : state,
});
export const dispatch = (action: Action) =>
  store.dispatch({ type: "lab/edit", payload: action });
export const current = () => store.getState();
export const useDocument = () =>
  useSyncExternalStore(store.subscribe, store.getState, store.getState);
