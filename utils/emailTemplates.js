const appName = 'Koshish Welfare';

const wrapHtml = ({ title, heading, content }) => {
  return `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;background:#ffffff">
    <h2 style="margin:0 0 8px 0;color:#0f172a">${title}</h2>
    <p style="margin:0 0 16px 0;color:#334155">${heading}</p>
    <div style="color:#0f172a;line-height:1.6">${content}</div>
    <hr style="margin:20px 0;border:0;border-top:1px solid #e5e7eb" />
    <p style="margin:0;color:#64748b;font-size:12px">This is an automated email from ${appName}.</p>
  </div>`;
};

const credentialsTemplate = ({ name, username, password, label = 'Credential Update', role, loginUrl } = {}) => {
  const safeName = name || 'User';
  const roleLabel = role ? ` as ${role}` : '';
  let content = `<p><strong>Username:</strong> ${username}</p><p><strong>Password:</strong> ${password}</p>`;
  
  if (loginUrl) {
    content += `<p><strong>Login URL:</strong> <a href="${loginUrl}" style="color:#0066cc;text-decoration:none">${loginUrl}</a></p>`;
  }
  
  content += `<p style="margin-top:16px;color:#ef4444"><strong>Important:</strong> Please change your password immediately after your first login.</p>`;
  
  return {
    subject: `${appName} | ${label}`,
    text: `Hello ${safeName},\n\nYour account has been created${roleLabel}.\n\nUsername: ${username}\nPassword: ${password}\n\nPlease change your password after login.${loginUrl ? `\n\nLogin: ${loginUrl}` : ''}`,
    html: wrapHtml({
      title: label,
      heading: `Hello ${safeName}, your account is ready!`,
      content
    })
  };
};

const onboardingTemplate = ({ name, username, role, loginUrl }) => {
  const safeName = name || 'User';
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';
  
  return {
    subject: `${appName} | Welcome ${roleLabel} - Account Created`,
    text: `Hello ${safeName},\n\nWelcome to ${appName}!\n\nYour account has been created as a ${roleLabel}.\n\nYou will receive login credentials in a separate email.${loginUrl ? `\n\nLogin to your account: ${loginUrl}` : ''}`,
    html: wrapHtml({
      title: `Welcome to ${appName}!`,
      heading: `Hello ${safeName}, welcome as ${roleLabel}!`,
      content: `<p>Your account has been successfully created.</p><p>You will receive your login credentials in a separate secure email.</p><p>Once you login, you'll be able to manage your account and perform your role-specific tasks.</p>${loginUrl ? `<p style="margin-top:16px"><a href="${loginUrl}" style="display:inline-block;padding:10px 20px;background:#0066cc;color:white;text-decoration:none;border-radius:4px">Login to Your Account</a></p>` : ''}`
    })
  };
};

const authEventTemplate = ({ role, eventType, actor, timestamp, ipAddress }) => {
  const when = timestamp || new Date().toISOString();
  const ip = ipAddress || 'Unknown';
  const roleLabel = role || 'user';
  const eventLabel = eventType || 'authentication event';

  return {
    subject: `${appName} | ${roleLabel} ${eventLabel}`,
    text: `Authentication notification\nRole: ${roleLabel}\nEvent: ${eventLabel}\nActor: ${actor || 'N/A'}\nTime: ${when}\nIP: ${ip}`,
    html: wrapHtml({
      title: 'Authentication Notification',
      heading: `A ${eventLabel} occurred for ${roleLabel}.`,
      content: `<p><strong>Role:</strong> ${roleLabel}</p><p><strong>Event:</strong> ${eventLabel}</p><p><strong>Actor:</strong> ${actor || 'N/A'}</p><p><strong>Time:</strong> ${when}</p><p><strong>IP:</strong> ${ip}</p>`
    })
  };
};

const holidayEventTemplate = ({ recipientName, sessionName, holidayTitle, holidayDate, description = '', action = 'updated' } = {}) => {
  const safeName = recipientName || 'User';
  const safeSession = sessionName || 'Academic Session';
  const safeHoliday = holidayTitle || 'Holiday';
  const safeDate = holidayDate || 'N/A';
  const safeAction = String(action || 'updated').toLowerCase();

  return {
    subject: `${appName} | Holiday ${safeAction}: ${safeHoliday}`,
    text: `Hello ${safeName},\n\nA holiday has been ${safeAction} for ${safeSession}.\n\nHoliday: ${safeHoliday}\nDate: ${safeDate}${description ? `\nDescription: ${description}` : ''}\n\nPlease check your schedule accordingly.`,
    html: wrapHtml({
      title: 'Holiday Notification',
      heading: `Hello ${safeName}, a holiday has been ${safeAction}.`,
      content: `<p><strong>Session:</strong> ${safeSession}</p><p><strong>Holiday:</strong> ${safeHoliday}</p><p><strong>Date:</strong> ${safeDate}</p>${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}<p style="margin-top:16px">Please check your schedule accordingly.</p>`
    })
  };
};

export { credentialsTemplate, authEventTemplate, onboardingTemplate, holidayEventTemplate };
