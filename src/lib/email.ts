// Transactional email (PRD FR-16/17, BRD FR-32). One tiny abstraction:
// Resend when RESEND_API_KEY is configured, otherwise the message is logged to
// the server console so the whole flow is walkable in local dev with no email
// infrastructure. The copy-link path never depends on delivery succeeding.

type SendArgs = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendResult = { delivered: boolean; error?: string };

const FROM =
  process.env.EMAIL_FROM ?? "Gift Finder <onboarding@resend.dev>";

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      [
        "",
        "━━━ email (dev transport — set RESEND_API_KEY to send) ━━━",
        `To:      ${args.to}`,
        `Subject: ${args.subject}`,
        "",
        args.text,
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
      ].join("\n"),
    );
    return { delivered: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [args.to],
        subject: args.subject,
        text: args.text,
        ...(args.html ? { html: args.html } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Email send failed (${res.status}): ${body}`);
      return { delivered: false, error: `Provider returned ${res.status}` };
    }
    return { delivered: true };
  } catch (err) {
    console.error("Email send failed:", err);
    return { delivered: false, error: "Network error" };
  }
}

/** Flow 3 — the invite, framed around the Receiver receiving thoughtful
 *  gifts, never around building a wishlist. */
export function inviteEmail(opts: {
  giverName: string;
  targetName: string;
  personalLine: string | null;
  claimUrl: string;
}): Omit<SendArgs, "to"> {
  const { giverName, targetName, personalLine, claimUrl } = opts;
  const lines = [
    `${giverName} is trying to find you something good.`,
    "",
    personalLine ??
      `They added a few things they think you're into and want to check they got it right. Takes about a minute — and no, you don't have to write a wishlist.`,
    "",
    `See what ${giverName} said: ${claimUrl}`,
  ];
  return {
    subject: `${giverName} is trying to find you something good`,
    text: lines.join("\n"),
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="font-weight: 600;">${escapeHtml(giverName)} is trying to find you something good.</h2>
        <p>${escapeHtml(
          personalLine ??
            `They added a few things they think you're into and want to check they got it right. Takes about a minute — and no, you don't have to write a wishlist.`,
        )}</p>
        <p style="margin-top: 24px;">
          <a href="${claimUrl}" style="background: #111; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            See what ${escapeHtml(giverName)} said
          </a>
        </p>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">
          This was sent because ${escapeHtml(giverName)} added ${escapeHtml(targetName)} on Gift Finder.
          If that's not you, you can ignore this — or open the link and choose "remove me".
        </p>
      </div>`,
  };
}

/** BRD FR-32 — tell the Giver their invite was claimed. Never reveals what
 *  the Receiver changed (PRD: edits are not attributed back). */
export function claimNotificationEmail(opts: {
  giverName: string;
  targetName: string;
  friendUrl: string;
}): Omit<SendArgs, "to"> {
  return {
    subject: `${opts.targetName} checked your gift notes`,
    text: [
      `Good news — ${opts.targetName} accepted your invite and looked over what you put together.`,
      "",
      `Their profile is live now, so your gift ideas just got sharper: ${opts.friendUrl}`,
    ].join("\n"),
  };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
