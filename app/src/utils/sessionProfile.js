export function sessionProfileId(session) {
  return session?.user?.uuid || session?.user?.email?.trim().toLowerCase() || null;
}

export function profileSummary(session) {
  return { id: sessionProfileId(session), name: session.user.name, email: session.user.email,
    requiresLogin: !session.accessToken };
}
