interface InviteEmailProps {
  inviterName: string;
  roomName: string;
  acceptUrl: string;
}

/**
 * Generates HTML email for room invitations.
 * Uses inline styles for maximum email client compatibility.
 */
export function renderInviteEmail({
  inviterName,
  roomName,
  acceptUrl,
}: InviteEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #dad4c8;border-radius:16px;padding:40px;">
          <tr>
            <td>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1e1e1e;">
                Scrawl
              </h1>
              <p style="margin:0 0 24px;font-size:14px;color:#8a8378;">
                Collaborative whiteboard
              </p>
              <p style="margin:0 0 16px;font-size:16px;color:#1e1e1e;line-height:1.5;">
                <strong>${escapeHtml(inviterName)}</strong> invited you to collaborate on
              </p>
              <div style="background:#faf9f7;border:2px solid #dad4c8;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
                <p style="margin:0;font-size:18px;font-weight:600;color:#1e1e1e;">
                  ${escapeHtml(roomName)}
                </p>
              </div>
              <a href="${acceptUrl}" style="display:inline-block;background:#1e1e1e;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:12px 32px;border-radius:10px;border:2px solid #1e1e1e;">
                Accept Invite
              </a>
              <p style="margin:24px 0 0;font-size:13px;color:#8a8378;line-height:1.5;">
                This invite expires in 7 days. If you didn't expect this email, you can ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
