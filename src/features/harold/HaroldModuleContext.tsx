"use client";

import { useEffect } from "react";
import { useHaroldAssistant } from "./HaroldAssistantProvider";

/**
 * Drop this into any page (server or client) to tell Harold which module the
 * user is on and, optionally, a sanitized snapshot of what is on screen.
 * It renders nothing.
 *
 * Example:
 *   <HaroldModuleContext moduleId="crm" recordType="customer_profile"
 *     recordId={contact.id} summary={`Viewing ${contact.name}`} />
 */
export function HaroldModuleContext({
  moduleId,
  recordType,
  recordId,
  summary,
  data,
}: {
  moduleId: string;
  recordType?: string;
  recordId?: string;
  summary?: string;
  data?: Record<string, unknown>;
}) {
  const { setModule } = useHaroldAssistant();

  const dataKey = data ? JSON.stringify(data) : "";

  useEffect(() => {
    setModule({ moduleId, recordType, recordId, summary, data });
    return () => setModule(null);
    // dataKey captures deep changes to `data` without identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, recordType, recordId, summary, dataKey, setModule]);

  return null;
}
