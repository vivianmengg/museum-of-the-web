import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const tag    = searchParams.get("tag");

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!tag) {
    return NextResponse.json({ error: "missing tag" }, { status: 400 });
  }

  revalidateTag(tag, {});
  return NextResponse.json({ revalidated: true, tag });
}
