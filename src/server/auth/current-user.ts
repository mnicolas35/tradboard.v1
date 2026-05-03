import { prisma } from "@/lib/prisma";

const MOCK_USER_EMAIL = "admin@tradboard.local";

export async function getCurrentUser() {
  const existingUser = await prisma.user.findFirst({
    where: { email: MOCK_USER_EMAIL, isActive: true }
  });

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
    data: {
      email: MOCK_USER_EMAIL,
      name: "Admin TradBoard",
      role: "ADMIN"
    }
  });
}
