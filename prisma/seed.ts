import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const seedDatabase = async () => {
  await prisma.program.createMany({
    data: [
      { name: "PKH" },
      { name: "BLT" },
      { name: "Bansos" },
    ],
  });
  console.log("Database berhasil diisi!");
};

seedDatabase()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
