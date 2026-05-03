declare namespace Express {
  interface User {
    githubId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string;
    profileUrl: string;
  }
}
