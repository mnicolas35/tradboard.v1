import type { UserRole } from "@prisma/client";

type Viewer = {
  id: string;
  role: UserRole;
};

export function getUserOwnedWhere(viewer: Viewer) {
  if (viewer.role === "ADMIN") {
    return {};
  }

  return {
    userId: viewer.id
  };
}
