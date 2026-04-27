import { normalizeOptionalString } from "../shared/string-coerce.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("sessions/transcript-events");

export type SessionTranscriptUpdate = {
  sessionFile: string;
  sessionKey?: string;
  message?: unknown;
  messageId?: string;
};

type SessionTranscriptListener = (update: SessionTranscriptUpdate) => void;

const SESSION_TRANSCRIPT_LISTENERS = new Set<SessionTranscriptListener>();

export function onSessionTranscriptUpdate(listener: SessionTranscriptListener): () => void {
  SESSION_TRANSCRIPT_LISTENERS.add(listener);
  return () => {
    SESSION_TRANSCRIPT_LISTENERS.delete(listener);
  };
}

export function emitSessionTranscriptUpdate(update: string | SessionTranscriptUpdate): void {
  const normalized =
    typeof update === "string"
      ? { sessionFile: update }
      : {
          sessionFile: update.sessionFile,
          sessionKey: update.sessionKey,
          message: update.message,
          messageId: update.messageId,
        };
  const trimmed = normalizeOptionalString(normalized.sessionFile);
  if (!trimmed) {
    return;
  }
  const nextUpdate: SessionTranscriptUpdate = {
    sessionFile: trimmed,
    ...(normalizeOptionalString(normalized.sessionKey)
      ? { sessionKey: normalizeOptionalString(normalized.sessionKey) }
      : {}),
    ...(normalized.message !== undefined ? { message: normalized.message } : {}),
    ...(normalizeOptionalString(normalized.messageId)
      ? { messageId: normalizeOptionalString(normalized.messageId) }
      : {}),
  };
  try {
    // Log minimal info to help trace unexpected transcript updates.
    const msg = nextUpdate.message as any;
    const abortRunId = msg?.openclawAbort?.runId ?? undefined;
    log.debug(
      `emitSessionTranscriptUpdate sessionKey=${nextUpdate.sessionKey ?? "-"} messageId=${nextUpdate.messageId ?? "-"} abortRunId=${abortRunId ?? "-"}`,
    );
  } catch {
    /* ignore logging failures */
  }
  for (const listener of SESSION_TRANSCRIPT_LISTENERS) {
    try {
      listener(nextUpdate);
    } catch {
      /* ignore */
    }
  }
}
