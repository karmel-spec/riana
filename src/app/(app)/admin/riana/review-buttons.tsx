"use client";

import { useTransition } from "react";
import { reviewRianaUpdate } from "@/app/actions/records";

export function ReviewButtons({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button type="button" disabled={pending} onClick={() => start(() => { reviewRianaUpdate(id, "approved"); })} className="btn-primary px-4">Approve</button>
      <button type="button" disabled={pending} onClick={() => start(() => { reviewRianaUpdate(id, "rejected"); })} className="btn-secondary px-4">Reject</button>
    </div>
  );
}
