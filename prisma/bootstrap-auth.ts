import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("IronMan04!!", 12);

  await prisma.user.upsert({
    where: { email: "admin" },
    update: {
      name: "admin",
      passwordHash,
      role: "ADMIN",
      isActive: true
    },
    create: {
      email: "admin",
      name: "admin",
      passwordHash,
      role: "ADMIN"
    }
  });

  console.log("Initial admin ready: admin");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
