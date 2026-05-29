import { NextResponse } from "next/server";

import { openApiDocument } from "@/lib/v1/openapi";

// Public, unauthenticated: the spec describes the API shape only (no data), so
// tooling (Swagger UI, Postman, codegen) can fetch it without a key.
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(openApiDocument);
}
