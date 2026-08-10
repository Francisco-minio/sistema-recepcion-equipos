import { prisma } from "./db.js";
import { importSchedule } from "./importSchedule.js";

importSchedule({ skipIfAdminExists: true })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
