-- CreateTable
CREATE TABLE "saas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "asaasId" TEXT NOT NULL,
    "comissao" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saas_slug_key" ON "saas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "saas_apiKeyHash_key" ON "saas"("apiKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "saas_asaasId_key" ON "saas"("asaasId");
