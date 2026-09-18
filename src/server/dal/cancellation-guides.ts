import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { CancellationGuideInput } from "@/features/cancellation/schema";

export type CancellationGuideDto = {
  id: string;
  subscriptionId: string;
  cancellationUrl: string | null;
  phoneNumber: string | null;
  instructions: string | null;
  verifiedAt: string | null;
  userNotes: string | null;
  updatedAt: string;
};

export class CancellationGuideConflictError extends Error {
  constructor() {
    super("The cancellation guide changed or is no longer available");
    this.name = "CancellationGuideConflictError";
  }
}

export async function getCancellationGuideForUser(
  userId: string,
  subscriptionId: string,
): Promise<CancellationGuideDto | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cancellation_guides")
    .select(
      "id, subscription_id, cancellation_url, phone_number, instructions, verified_at, user_notes, updated_at",
    )
    .eq("user_id", userId)
    .eq("subscription_id", subscriptionId)
    .maybeSingle();
  if (error) throw new Error("Unable to load the cancellation guide");
  if (!data) return null;

  return {
    id: data.id,
    subscriptionId: data.subscription_id,
    cancellationUrl: data.cancellation_url,
    phoneNumber: data.phone_number,
    instructions: data.instructions,
    verifiedAt: data.verified_at,
    userNotes: data.user_notes,
    updatedAt: data.updated_at,
  };
}

export async function saveCancellationGuideForUser(
  input: CancellationGuideInput,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_cancellation_guide", {
    target_subscription_id: input.subscriptionId,
    ...(input.expectedGuideUpdatedAt
      ? { expected_guide_updated_at: input.expectedGuideUpdatedAt }
      : {}),
    ...(input.cancellationUrl
      ? { guide_cancellation_url: input.cancellationUrl }
      : {}),
    ...(input.phoneNumber ? { guide_phone_number: input.phoneNumber } : {}),
    ...(input.instructions ? { guide_instructions: input.instructions } : {}),
    ...(input.verifiedAt ? { guide_verified_at: input.verifiedAt } : {}),
    ...(input.userNotes ? { guide_user_notes: input.userNotes } : {}),
  });
  if (error) {
    if (error.message.includes("GUIDE_CONFLICT")) {
      throw new CancellationGuideConflictError();
    }
    throw new Error("Unable to save the cancellation guide");
  }
}
