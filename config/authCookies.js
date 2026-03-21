const buildCookieOptions = (req) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isHttpsRequest = Boolean(
    req?.secure || req?.headers?.['x-forwarded-proto'] === 'https'
  );
  const secure = isProduction && isHttpsRequest;

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
};

const setAuthCookie = (res, cookieName, token) => {
  res.cookie(cookieName, token, buildCookieOptions(res.req));
};

const clearAuthCookie = (res, cookieName) => {
  const { maxAge, ...clearOptions } = buildCookieOptions(res.req);
  res.clearCookie(cookieName, clearOptions);
};

export { setAuthCookie, clearAuthCookie };
