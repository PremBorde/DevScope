import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { logger } from "../lib/logger";

export interface GithubSessionUser {
  githubId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string;
  profileUrl: string;
}

passport.serializeUser((user, done) => {
  done(null, user as GithubSessionUser);
});

passport.deserializeUser((user: GithubSessionUser, done) => {
  done(null, user);
});

export function configurePassport(): void {
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    logger.warn("GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET not set — GitHub OAuth disabled");
    return;
  }

  // Callback URL: use explicit env var (required for GitHub OAuth app registration)
  // Falls back to relative path which works behind the Replit proxy
  const callbackURL =
    process.env.GITHUB_CALLBACK_URL ?? "/api/auth/github/callback";

  passport.use(
    new GitHubStrategy(
      { clientID, clientSecret, callbackURL },
      (_accessToken, _refreshToken, profile, done) => {
        const user: GithubSessionUser = {
          githubId: profile.id,
          username: profile.username ?? profile.displayName ?? "unknown",
          displayName: profile.displayName ?? null,
          avatarUrl: profile.photos?.[0]?.value ?? "",
          profileUrl:
            profile.profileUrl ??
            `https://github.com/${profile.username ?? ""}`,
        };
        logger.info({ username: user.username }, "GitHub OAuth login successful");
        return done(null, user);
      }
    )
  );

  logger.info({ callbackURL }, "GitHub OAuth strategy registered");
}

export default passport;
