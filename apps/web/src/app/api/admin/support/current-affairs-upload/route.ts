import { NextResponse } from "next/server";
import { extractUploadFiles } from "@/lib/file-extract";
import {
  getLatestAdminCurrentAffairsPack,
  saveAdminCurrentAffairsPack,
} from "@/lib/current-affairs-pack";
import { isBillingAdminEmail } from "@/lib/billing-admin";
import { getAuthenticatedAppUser } from "@/lib/product-access";

function toFiles(items: FormDataEntryValue[]) {
  return items.filter((item): item is File => item instanceof File && item.size > 0);
}

export async function GET() {
  const authUser = await getAuthenticatedAppUser();

  if (!authUser) {
    return NextResponse.json({ message: "Sign in to use admin uploads." }, { status: 401 });
  }

  if (!isBillingAdminEmail(authUser.profile.email)) {
    return NextResponse.json(
      { message: "Current affairs admin uploads are restricted to TamGam admins." },
      { status: 403 },
    );
  }

  const pack = await getLatestAdminCurrentAffairsPack();

  return NextResponse.json({
    ok: true,
    pack,
  });
}

export async function POST(request: Request) {
  const authUser = await getAuthenticatedAppUser();

  if (!authUser) {
    return NextResponse.json({ message: "Sign in to use admin uploads." }, { status: 401 });
  }

  if (!isBillingAdminEmail(authUser.profile.email)) {
    return NextResponse.json(
      { message: "Current affairs admin uploads are restricted to TamGam admins." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const newspaperFiles = toFiles(formData.getAll("newspaper"));
  const magazineFiles = toFiles(formData.getAll("magazine"));

  if (!newspaperFiles.length && !magazineFiles.length) {
    return NextResponse.json(
      { message: "Upload at least one newspaper or magazine file." },
      { status: 400 },
    );
  }

  try {
    const [newspapers, magazines] = await Promise.all([
      extractUploadFiles(newspaperFiles),
      extractUploadFiles(magazineFiles),
    ]);

    const pack = await saveAdminCurrentAffairsPack({
      newspapers,
      magazines,
      uploadedByEmail: authUser.profile.email,
    });

    return NextResponse.json({
      ok: true,
      message: "Admin current affairs pack updated.",
      pack,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to process the current affairs uploads right now.",
      },
      { status: 400 },
    );
  }
}

