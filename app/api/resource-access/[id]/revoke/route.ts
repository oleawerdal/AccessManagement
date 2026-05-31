import { NextRequest, NextResponse } from "next/server";

import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { resourceAccessRevokeSchema } from "@/lib/validators";
import { revokeResourceAccess } from "@/lib/services/resource-access";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const { reason, credentialReturned } = resourceAccessRevokeSchema.parse(
      await req.json(),
    );
    const result = await revokeResourceAccess({
      accessId: params.id,
      reason,
      credentialReturned,
      revokedBy: session.user.email ?? undefined,
    });
    return NextResponse.json(result);
  });
}
