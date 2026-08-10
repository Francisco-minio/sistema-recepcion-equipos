PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "Visit";
DROP TABLE IF EXISTS "Client";
DROP TABLE IF EXISTS "User";

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "phone" TEXT,
  "zone" TEXT,
  "specialty" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Client" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Visit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "ticketNumber" TEXT,
  "equipmentDiagnosis" TEXT,
  "equipmentStatus" TEXT,
  "startDateTime" DATETIME NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 90,
  "recurrence" TEXT NOT NULL DEFAULT 'NONE',
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "clientId" TEXT NOT NULL,
  "technicianId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Visit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Visit_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Visit_clientId_idx" ON "Visit"("clientId");
CREATE INDEX "Visit_technicianId_idx" ON "Visit"("technicianId");

PRAGMA foreign_keys=ON;
