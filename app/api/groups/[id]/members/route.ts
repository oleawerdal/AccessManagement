import { NextRequest, NextResponse } from "next/server";

import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { groupMemberSchema } from "@/lib/validators";
import { addGroupMember, removeGroupMember } from "@/lib/services/groups";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const { personId } = groupMemberSchema.parse(await req.json());
    const membership = await addGroupMember({
      personId,
      groupId: params.id,
      addedBy: session.user.email ?? undefined,
    });
    return NextResponse.json(membership, { status: 201 });
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const { personId } = groupMemberSchema.parse(await req.json());
    await removeGroupMember({ personId, groupId: params.id });
    return NextResponse.json({ ok: true });
  });
}
