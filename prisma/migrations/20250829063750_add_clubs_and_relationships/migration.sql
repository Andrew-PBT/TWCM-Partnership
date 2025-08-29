-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'READY_TO_FULFILL', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'PAYMENT_PENDING');

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "shopifyCustomerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "partnerStoreId" TEXT NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "shopifyId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "acceptsMarketing" BOOLEAN NOT NULL DEFAULT false,
    "clubId" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "name" TEXT,
    "customerEmail" TEXT NOT NULL,
    "clubId" TEXT,
    "totalPrice" TEXT NOT NULL,
    "subtotalPrice" TEXT,
    "totalTax" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lineItemsCount" INTEGER NOT NULL DEFAULT 0,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "fulfillmentStatus" TEXT,
    "financialStatus" TEXT,
    "assignedStoreId" TEXT,
    "customerId" TEXT,
    "assignedStoreName" TEXT,
    "assignedStoreEmail" TEXT,
    "clubInfo" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "shopifyCreatedAt" TIMESTAMP(3) NOT NULL,
    "shopifyUpdatedAt" TIMESTAMP(3),
    "shopifyShop" TEXT,
    "source" TEXT NOT NULL DEFAULT 'shopify',
    "tags" TEXT,
    "note" TEXT,
    "orderStatusUrl" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "carrier" TEXT,
    "internalNotes" TEXT,
    "noteAddedAt" TIMESTAMP(3),
    "statusNote" TEXT,
    "statusUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shopifyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "variantTitle" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" TEXT NOT NULL,
    "totalPrice" TEXT NOT NULL,
    "sku" TEXT,
    "vendor" TEXT,
    "fulfillmentStatus" TEXT,
    "image" TEXT,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clubs_name_key" ON "clubs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_shopifyCustomerId_key" ON "clubs"("shopifyCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_email_key" ON "clubs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "stores_name_key" ON "stores"("name");

-- CreateIndex
CREATE UNIQUE INDEX "stores_email_key" ON "stores"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_shopifyId_key" ON "customers"("shopifyId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderId_key" ON "orders"("orderId");

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_partnerStoreId_fkey" FOREIGN KEY ("partnerStoreId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerEmail_fkey" FOREIGN KEY ("customerEmail") REFERENCES "customers"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_assignedStoreId_fkey" FOREIGN KEY ("assignedStoreId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
