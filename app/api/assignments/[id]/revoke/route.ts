import { NextRequest, NextResponse } from "next/server";

import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { assignmentRevokeSchema } from "@/lib/validators";
import { revokeAssignment } from "@/lib/services/assignments";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const { reason } = assignmentRevokeSchema.parse(await req.json());
    const result = await revokeAssignment({
      assignmentId: params.id,
      reason,
      revokedBy: session.user.email ?? undefined,
    });
    return NextResponse.json(result);
  });
}
