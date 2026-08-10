export type AuthUser = {
  id: string;
  email: string;
  role: import("@prisma/client").Role;
};
