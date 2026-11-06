"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";

type Result = { ok: true } | { ok: false; error: string };
const nul = (s: string | undefined) => (s ? s : null);
const num = (s: string | number | undefined) => (s === "" || s === undefined ? null : Number(s));
const Opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

async function need() {
  const v = await getViewer();
  if (!canWrite(v, "properties")) throw new Error("You don't have permission to change vehicles.");
  return v;
}
const bump = (name: string, action: "create" | "update", summary: string, entity: string) =>
  demoStore().audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: name, action, section: "properties", entity, via: "app", summary });

const VehicleForm = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  year: z.coerce.number().int().min(1900).max(2100).optional().or(z.literal("")),
  make: z.string().trim().min(2, "Make?").max(80),
  model: Opt(80), nickname: Opt(80), engine: Opt(120),
  vin_last4: z.string().trim().regex(/^[0-9A-Za-z]{4}$/, "Last 4 of the VIN only.").optional().or(z.literal("")),
  estimated_value: z.coerce.number().nonnegative().optional().or(z.literal("")),
  valuation_on: z.string().optional().or(z.literal("")),
  valuation_source: Opt(200), title_location: Opt(200),
  owner: z.enum(["rich", "diana", "both"]),
  insurance_policy_id: z.string().uuid().optional().or(z.literal("")),
  estate_provision_id: z.string().uuid().optional().or(z.literal("")),
  specs_file_id: z.string().uuid().optional().or(z.literal("")),
  notes: Opt(2000),
});

export async function saveVehicle(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need();
    const parsed = VehicleForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data;
    const row = {
      year: num(d.year), make: d.make, model: nul(d.model), nickname: nul(d.nickname), engine: nul(d.engine), vin_last4: nul(d.vin_last4),
      estimated_value: num(d.estimated_value), valuation_on: nul(d.valuation_on), valuation_source: nul(d.valuation_source), title_location: nul(d.title_location),
      owner: d.owner, insurance_policy_id: nul(d.insurance_policy_id), estate_provision_id: nul(d.estate_provision_id), specs_file_id: nul(d.specs_file_id), notes: nul(d.notes),
    };
    if (v.demo) {
      const s = demoStore();
      if (id) { const x = s.vehicles.find((y) => y.id === id); if (!x) return { ok: false, error: "Not found." }; Object.assign(x, row); }
      else s.vehicles.push({ id: crypto.randomUUID(), ...row, source: "app" });
      bump(v.name, id ? "update" : "create", `${id ? "Updated" : "Added"} vehicle ${d.nickname || `${d.year ?? ""} ${d.make}`}`, "vehicles");
    } else {
      const supabase = await createClient();
      const { error } = id ? await supabase.from("vehicles").update(row).eq("id", id) : await supabase.from("vehicles").insert(row);
      if (error) return { ok: false, error: "Could not save the vehicle." };
    }
    revalidatePath("/vehicles"); revalidatePath("/properties");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

const ImprovementForm = z.object({
  vehicle_id: z.string().uuid(),
  done_on: z.string().optional().or(z.literal("")),
  done_on_approx: Opt(40),
  description: z.string().trim().min(2, "What was done?").max(500),
  cost: z.coerce.number().nonnegative().optional().or(z.literal("")),
  vendor: Opt(120),
});

export async function addImprovement(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need();
    const parsed = ImprovementForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data;
    const row = { vehicle_id: d.vehicle_id, done_on: nul(d.done_on), done_on_approx: nul(d.done_on_approx), description: d.description, cost: num(d.cost), vendor: nul(d.vendor) };
    if (v.demo) {
      demoStore().improvements.push({ id: crypto.randomUUID(), ...row, imported_file_id: null, source: "app" });
      bump(v.name, "create", `Added improvement: ${d.description}`, "vehicle_improvements");
    } else {
      const supabase = await createClient();
      const { error } = await supabase.from("vehicle_improvements").insert(row);
      if (error) return { ok: false, error: "Could not save." };
    }
    revalidatePath("/vehicles");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
