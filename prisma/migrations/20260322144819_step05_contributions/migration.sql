-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID');

-- CreateTable
CREATE TABLE "GroupCycle" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "payoutToMemberId" TEXT,
    "payoutConfirmedAt" TIMESTAMP(3),

    CONSTRAINT "GroupCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupCycle_groupId_idx" ON "GroupCycle"("groupId");

-- CreateIndex
CREATE INDEX "GroupCycle_status_idx" ON "GroupCycle"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCycle_groupId_periodKey_key" ON "GroupCycle"("groupId", "periodKey");

-- CreateIndex
CREATE INDEX "Contribution_cycleId_idx" ON "Contribution"("cycleId");

-- CreateIndex
CREATE INDEX "Contribution_memberId_idx" ON "Contribution"("memberId");

-- CreateIndex
CREATE INDEX "Contribution_status_idx" ON "Contribution"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_cycleId_memberId_key" ON "Contribution"("cycleId", "memberId");

-- AddForeignKey
ALTER TABLE "GroupCycle" ADD CONSTRAINT "GroupCycle_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "GroupCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GroupMembers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
