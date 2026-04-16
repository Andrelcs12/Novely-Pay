-- CreateTable
CREATE TABLE "sellers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL,
    "mobilePhone" TEXT NOT NULL,
    "asaasCustomerId" TEXT,
    "saasId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sellers_email_key" ON "sellers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_cpfCnpj_key" ON "sellers"("cpfCnpj");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_asaasCustomerId_key" ON "sellers"("asaasCustomerId");

-- AddForeignKey
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_saasId_fkey" FOREIGN KEY ("saasId") REFERENCES "saas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
