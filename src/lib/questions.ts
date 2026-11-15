import type { UrgentQuestion } from "./types";

/** Questions about Rich's or Diana's health. They are listed on the Health pages, not on the Questions tab. */
export const isHealthQuestion = (q: Pick<UrgentQuestion, "topic">) => q.topic === "health_rich" || q.topic === "health_diana";
