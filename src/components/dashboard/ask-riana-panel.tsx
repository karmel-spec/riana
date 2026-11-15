import type { Viewer } from "@/lib/session";
import { canAskRiana, getRianaThread, NOT_READY } from "@/lib/riana/questions";
import { AskRiana } from "./ask-riana";

/**
 * Loads the Ask Riana thread for this person and shows the chat. Renders
 * nothing for anyone but Rich, Diana and the super admins. `big` is the Brief
 * view; `admin` shows the whole household thread with how each message arrived.
 */
export async function AskRianaPanel({ viewer: v, big = false, admin = false }: { viewer: Viewer; big?: boolean; admin?: boolean }) {
  if (!canAskRiana(v)) return null;
  const thread = await getRianaThread(v);
  const isAdmin = v.role === "super_admin";
  return (
    <AskRiana
      initial={thread.questions}
      ready={thread.ready}
      role={isAdmin ? "super_admin" : "parent"}
      defaultAsker={v.isSubject === "rich" || v.isSubject === "diana" ? v.isSubject : null}
      big={big}
      showChannel={admin && isAdmin}
      notReadyDetail={isAdmin ? (thread.missing ? NOT_READY : "The chat could not be loaded just now. Check the server log.") : undefined}
    />
  );
}
