"use client";

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const storageKey = "shearwater-theme";
const themeChangeEvent = "shearwater:theme-change";

function getThemeSnapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

function subscribe(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key !== storageKey) return;
    if (event.newValue === "light" || event.newValue === "dark") {
      document.documentElement.dataset.theme = event.newValue;
      document.documentElement.style.colorScheme = event.newValue;
    }
    onStoreChange();
  }

  window.addEventListener(themeChangeEvent, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(themeChangeEvent, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getThemeSnapshot, getServerSnapshot);
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(storageKey, theme);
  window.dispatchEvent(new Event(themeChangeEvent));
}
