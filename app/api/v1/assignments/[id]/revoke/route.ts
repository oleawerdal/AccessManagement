import { NextRequest, NextResponse } from "next/server";

import { withApiV1, assertKeyCanMutate } from "@/lib/api-v1";
import { assignmentRevokeSchema } from "@/lib/validators";
import { revokeAssignment } from "@/lib/services/assignments";
import { serializeAssignment } from "@/lib/v1/serializers";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: Params) {
  return withApiV1(async (principal) => {
    assertKeyCanMutate(principal);
    const { reason } = assignmentRevokeSchema.parse(await req.json());
    const result = await revokeAssignment({
      assignmentId: params.id,
      reason,
      revokedBy: `api:${principal.name}`,
    });
    return NextResponse.json(serializeAssignment(result));
  });
}
