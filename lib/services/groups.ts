import { Prisma } from "@prisma/client";
import { addDays } from "date-fns";

import { prisma } from "@/lib/prisma";
import { logGrant, logRevoke } from "@/lib/audit";
import { assignmentInclude, assignmentLabel } from "./assignments";

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/** Materialise a single GROUP-sourced assignment for a person + group role. */
async function grantFromGroup(
  personId: string,
  groupId: string,
  roleId: string,
  defaultExpiryDays: number | null,
  addedBy?: string,
) {
  const existing = await prisma.roleAssignment.findUnique({
    where: { personId_roleId_source: { personId, roleId, source: "GROUP" } },
  });
  if (existing && !existing.revokedAt) return; // already active via group

  const expiresAt = defaultExpiryDays ? addDays(new Date(), defaultExpiryDays) : null;

  const assignment = existing
    ? await prisma.roleAssignment.update({
        where: { id: existing.id },
        data: {
          sourceGroupId: groupId,
          expiresAt,
          grantedBy: addedBy,
          grantedAt: new Date(),
          revokedAt: null,
          revokedBy: null,
          revokeReason: null,
        },
        include: assignmentInclude,
      })
    : await prisma.roleAssignment.create({
        data: {
          personId,
          roleId,
          source: "GROUP",
          sourceGroupId: groupId,
          expiresAt,
          grantedBy: addedBy,
        },
        include: assignmentInclude,
      });

  await logGrant({
    assignmentId: assignment.id,
    label: assignmentLabel(assignment),
    after: toJson(assignment),
    metadata: { source: "GROUP", groupId },
  });
}

/** Remove a single GROUP-sourced assignment (logs REVOKE, then deletes). */
async function removeGroupAssignment(personId: string, roleId: string, groupId: string) {
  const existing = await prisma.roleAssignment.findUnique({
    where: { personId_roleId_source: { personId, roleId, source: "GROUP" } },
    include: assignmentInclude,
  });
  if (!existing || existing.sourceGroupId !== groupId) return;

  await logRevoke({
    assignmentId: existing.id,
    label: assignmentLabel(existing),
    before: toJson(existing),
    after: toJson({ ...existing, removed: true }),
    metadata: { reason: "Fjernet fra gruppe", groupId },
  });

  await prisma.roleAssignment.delete({ where: { id: existing.id } });
}

/**
 * Add a person to a group: creates the membership and grants all of the
 * group's roles to the person with source = GROUP.
 */
export async function addGroupMember(input: {
  personId: string;
  groupId: string;
  addedBy?: string;
}) {
  const membership = await prisma.groupMembership.create({
    data: {
      personId: input.personId,
      groupId: input.groupId,
      addedBy: input.addedBy,
    },
  });

  const groupRoles = await prisma.groupRole.findMany({
    where: { groupId: input.groupId },
  });
  for (const gr of groupRoles) {
    await grantFromGroup(
      input.personId,
      input.groupId,
      gr.roleId,
      gr.defaultExpiryDays,
      input.addedBy,
    );
  }

  return membership;
}

/**
 * Remove a person from a group: deletes the membership and removes all
 * GROUP-inherited assignments from this group. Direct assignments are kept.
 */
export async function removeGroupMember(input: {
  personId: string;
  groupId: string;
}) {
  const membership = await prisma.groupMembership.findUnique({
    where: {
      personId_groupId: { personId: input.personId, groupId: input.groupId },
    },
  });
  if (!membership) return;

  const groupRoles = await prisma.groupRole.findMany({
    where: { groupId: input.groupId },
  });
  for (const gr of groupRoles) {
    await removeGroupAssignment(input.personId, gr.roleId, input.groupId);
  }

  await prisma.groupMembership.delete({ where: { id: membership.id } });
}

/**
 * Reconcile every member's GROUP assignments with the group's current role
 * set. Called after a group's roles are changed.
 */
export async function syncGroupMembers(groupId: string) {
  const [groupRoles, memberships] = await Promise.all([
    prisma.groupRole.findMany({ where: { groupId } }),
    prisma.groupMembership.findMany({ where: { groupId } }),
  ]);
  const roleIds = new Set(groupRoles.map((r) => r.roleId));

  for (const member of memberships) {
    // Grant any newly added roles.
    for (const gr of groupRoles) {
      await grantFromGroup(
        member.personId,
        groupId,
        gr.roleId,
        gr.defaultExpiryDays,
        member.addedBy ?? undefined,
      );
    }
    // Remove GROUP assignments for roles that are no longer in the group.
    const groupAssignments = await prisma.roleAssignment.findMany({
      where: { personId: member.personId, source: "GROUP", sourceGroupId: groupId },
    });
    for (const a of groupAssignments) {
      if (!roleIds.has(a.roleId)) {
        await removeGroupAssignment(member.personId, a.roleId, groupId);
      }
    }
  }
}
