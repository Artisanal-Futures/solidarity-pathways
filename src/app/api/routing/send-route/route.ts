/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NextResponse } from "next/server";

import { emailService } from "~/lib/email";
import NewRouteTemplate from "~/lib/email/email-templates/new-route-template";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emailBundles } = body as {
      emailBundles: Array<{ email: string; url: string; passcode: string }>;
    };

    if (!emailBundles || emailBundles.length === 0) {
      return NextResponse.json("Invalid email bundles", { status: 400 });
    }

    const data = await Promise.all(
      emailBundles.map(
        async (bundle: { email: string; url: string; passcode: string }) => {
          const emailData = await emailService.sendEmail({
            from: "Artisanal Futures <no-reply@artisanalfutures.org>",
            to: bundle.email,
            subject: "New Route Assignment from Solidarity Pathways",
            template: NewRouteTemplate,
            data: {
              email: bundle.email,
              loginCode: bundle.passcode,
              url: bundle.url,
            },
          });

          return emailData;
        },
      ),
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(error, { status: 400 });
  }
}
