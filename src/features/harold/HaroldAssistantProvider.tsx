"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { HaroldAccess } from "./harold-modules";

export interface HaroldModuleSnapshot {
  moduleId: string;
  recordType?: string;
  recordId?: string;
  summary?: string;
  data?: Record<string, unknown>;
}

interface HaroldAssistantContextValue {
  access: HaroldAccess;
  module: HaroldModuleSnapshot | null;
  setModule: (snapshot: HaroldModuleSnapshot | null) => void;
}

const HaroldAssistantContext =
  createContext<HaroldAssistantContextValue | null>(null);

export function HaroldAssistantProvider({
  access,
  children,
}: {
  access: HaroldAccess;
  children: ReactNode;
}) {
  const [module, setModule] = useState<HaroldModuleSnapshot | null>(null);

  const value = useMemo<HaroldAssistantContextValue>(
    () => ({ access, module, setModule }),
    [access, module],
  );

  return (
    <HaroldAssistantContext.Provider value={value}>
      {children}
    </HaroldAssistantContext.Provider>
  );
}

export function useHaroldAssistant() {
  const value = useContext(HaroldAssistantContext);
  if (!value) {
    throw new Error(
      "useHaroldAssistant must be used inside a HaroldAssistantProvider.",
    );
  }
  return value;
}
