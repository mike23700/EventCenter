export type Role = 'super_admin' | 'client';

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentUser: CurrentUser | null;
    }
  }
}
