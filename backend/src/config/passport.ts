import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { logger } from "../lib/logger";
import { db, users, eq } from "@workspace/db";

export interface GithubSessionUser {
  id: string; // Database UUID
  githubId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string;
  profileUrl: string;
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return done(null, false);
    done(null, user);
  } catch (err) {
    done(err);
  }
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
      async (_accessToken: string, _refreshToken: string, profile: passport.Profile, done: (err: unknown, user?: any | false) => void) => {
        try {
          const ghProfile = profile as passport.Profile & { profileUrl?: string };
          const githubId = profile.id;
          const username = profile.username ?? profile.displayName ?? "unknown";
          const displayName = profile.displayName ?? null;
          const avatarUrl = profile.photos?.[0]?.value ?? "";
          const profileUrl = ghProfile.profileUrl ?? `https://github.com/${profile.username ?? ""}`;

          // Upsert user
          const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.githubId, githubId));

          let user;
          if (existingUser) {
            [user] = await db
              .update(users)
              .set({
                username,
                displayName,
                avatarUrl,
                profileUrl,
                updatedAt: new Date(),
              })
              .where(eq(users.githubId, githubId))
              .returning();
            logger.info({ username: user.username }, "GitHub OAuth login (returning user)");
          } else {
            [user] = await db
              .insert(users)
              .values({
                githubId,
                username,
                displayName,
                avatarUrl,
                profileUrl,
              })
              .returning();
            logger.info({ username: user.username }, "GitHub OAuth login (new user)");
          }

          return done(null, user);
        } catch (err) {
          logger.error({ err }, "Error during GitHub OAuth strategy callback");
          return done(err);
        }
      }
    )
  );

  logger.info({ callbackURL }, "GitHub OAuth strategy registered");
}

export default passport;
