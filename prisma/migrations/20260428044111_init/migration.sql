/*
  Warnings:

  - The values [SENT] on the enum `SunatStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdById` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `quoteId` on the `ElectronicInvoice` table. All the data in the column will be lost.
  - The primary key for the `InvoiceSequence` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdById` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `updatedById` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `wholesalePrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `isCompleted` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `reservedQty` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `qtyAfter` on the `StockMovement` table. All the data in the column will be lost.
  - You are about to drop the column `qtyBefore` on the `StockMovement` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `StockMovement` table. All the data in the column will be lost.
  - The primary key for the `SystemConfig` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `lastLogin` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Courier` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Quote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuoteItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Shipment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShipmentHistory` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[code]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[saleId]` on the table `ElectronicInvoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `ElectronicInvoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `PaymentMethod` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,warehouseId]` on the table `Stock` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `documentType` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `saleId` to the `ElectronicInvoice` table without a default value. This is not possible if the table is not empty.
  - Made the column `invoiceNumber` on table `ElectronicInvoice` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `code` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Made the column `sku` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `warehouseId` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `warehouseId` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `warehouseId` to the `StockMovement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `Supplier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('VALID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "LoyaltyTxType" AS ENUM ('SALE', 'CHARGE', 'REDEEM', 'ADJUST');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StocktakingStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "StoreOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_RECEIVED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "StorePaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MovementType" ADD VALUE 'STOCKTAKING';
ALTER TYPE "MovementType" ADD VALUE 'TRANSFER_IN';
ALTER TYPE "MovementType" ADD VALUE 'TRANSFER_OUT';
ALTER TYPE "MovementType" ADD VALUE 'OWN_USE';
ALTER TYPE "MovementType" ADD VALUE 'CONVERT_IN';
ALTER TYPE "MovementType" ADD VALUE 'CONVERT_OUT';

-- AlterEnum
BEGIN;
CREATE TYPE "SunatStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
ALTER TABLE "public"."ElectronicInvoice" ALTER COLUMN "sunatStatus" DROP DEFAULT;
ALTER TABLE "ElectronicInvoice" ALTER COLUMN "sunatStatus" TYPE "SunatStatus_new" USING ("sunatStatus"::text::"SunatStatus_new");
ALTER TYPE "SunatStatus" RENAME TO "SunatStatus_old";
ALTER TYPE "SunatStatus_new" RENAME TO "SunatStatus";
DROP TYPE "public"."SunatStatus_old";
ALTER TABLE "ElectronicInvoice" ALTER COLUMN "sunatStatus" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CASHIER';

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ElectronicInvoice" DROP CONSTRAINT "ElectronicInvoice_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ElectronicInvoice" DROP CONSTRAINT "ElectronicInvoice_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_paymentMethodId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_verifiedById_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "ProductCategory" DROP CONSTRAINT "ProductCategory_parentId_fkey";

-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "QuoteItem" DROP CONSTRAINT "QuoteItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "QuoteItem" DROP CONSTRAINT "QuoteItem_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_courierId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "ShipmentHistory" DROP CONSTRAINT "ShipmentHistory_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ShipmentHistory" DROP CONSTRAINT "ShipmentHistory_shipmentId_fkey";

-- DropForeignKey
ALTER TABLE "Stock" DROP CONSTRAINT "Stock_productId_fkey";

-- DropForeignKey
ALTER TABLE "SupplierProduct" DROP CONSTRAINT "SupplierProduct_productId_fkey";

-- DropForeignKey
ALTER TABLE "SupplierProduct" DROP CONSTRAINT "SupplierProduct_supplierId_fkey";

-- DropIndex
DROP INDEX "ActivityLog_createdAt_idx";

-- DropIndex
DROP INDEX "ActivityLog_module_idx";

-- DropIndex
DROP INDEX "ActivityLog_userId_idx";

-- DropIndex
DROP INDEX "Customer_documentNumber_idx";

-- DropIndex
DROP INDEX "Customer_name_idx";

-- DropIndex
DROP INDEX "Customer_phone_idx";

-- DropIndex
DROP INDEX "ElectronicInvoice_customerDoc_idx";

-- DropIndex
DROP INDEX "ElectronicInvoice_invoiceNumber_idx";

-- DropIndex
DROP INDEX "Product_barcode_idx";

-- DropIndex
DROP INDEX "Product_categoryId_idx";

-- DropIndex
DROP INDEX "Product_isActive_isPublished_idx";

-- DropIndex
DROP INDEX "Product_sku_idx";

-- DropIndex
DROP INDEX "Purchase_purchaseDate_idx";

-- DropIndex
DROP INDEX "Purchase_supplierId_idx";

-- DropIndex
DROP INDEX "Stock_productId_key";

-- DropIndex
DROP INDEX "StockMovement_createdAt_idx";

-- DropIndex
DROP INDEX "StockMovement_movementType_idx";

-- DropIndex
DROP INDEX "StockMovement_productId_idx";

-- DropIndex
DROP INDEX "User_email_idx";

-- DropIndex
DROP INDEX "User_role_idx";

-- AlterTable
ALTER TABLE "ActivityLog" ALTER COLUMN "action" SET DATA TYPE TEXT,
ALTER COLUMN "module" SET DATA TYPE TEXT,
ALTER COLUMN "recordId" SET DATA TYPE TEXT,
ALTER COLUMN "ipAddress" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "createdById",
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "code" TEXT,
ADD COLUMN     "sex" TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "phone" SET DATA TYPE TEXT,
ALTER COLUMN "phoneAlt" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "address" SET DATA TYPE TEXT,
ALTER COLUMN "district" SET DATA TYPE TEXT,
ALTER COLUMN "city" SET DATA TYPE TEXT,
ALTER COLUMN "region" SET DATA TYPE TEXT,
ALTER COLUMN "documentType" SET NOT NULL,
ALTER COLUMN "documentType" SET DATA TYPE TEXT,
ALTER COLUMN "documentNumber" SET DATA TYPE TEXT,
ALTER COLUMN "notes" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ElectronicInvoice" DROP COLUMN "quoteId",
ADD COLUMN     "saleId" TEXT NOT NULL,
ALTER COLUMN "invoiceType" DROP DEFAULT,
ALTER COLUMN "series" SET DATA TYPE TEXT,
ALTER COLUMN "invoiceNumber" SET NOT NULL,
ALTER COLUMN "invoiceNumber" SET DATA TYPE TEXT,
ALTER COLUMN "issuerRuc" SET DATA TYPE TEXT,
ALTER COLUMN "issuerName" SET DATA TYPE TEXT,
ALTER COLUMN "customerDocType" SET DATA TYPE TEXT,
ALTER COLUMN "customerDoc" SET DATA TYPE TEXT,
ALTER COLUMN "customerName" SET DATA TYPE TEXT,
ALTER COLUMN "customerAddress" SET DATA TYPE TEXT,
ALTER COLUMN "invoiceDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "xmlFileUrl" SET DATA TYPE TEXT,
ALTER COLUMN "pdfFileUrl" SET DATA TYPE TEXT,
ALTER COLUMN "hashCode" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "InvoiceSequence" DROP CONSTRAINT "InvoiceSequence_pkey",
ALTER COLUMN "series" SET DATA TYPE TEXT,
ADD CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("series");

-- AlterTable
ALTER TABLE "PaymentMethod" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "type" SET DATA TYPE TEXT,
ALTER COLUMN "accountInfo" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "createdById",
DROP COLUMN "updatedById",
DROP COLUMN "wholesalePrice",
ADD COLUMN     "memberPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "spec" TEXT,
ADD COLUMN     "vipPrice2" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vipPrice3" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vipPrice4" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vipPrice5" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "wholesalePrice1" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "wholesalePrice2" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "wholesalePrice3" DECIMAL(10,2) NOT NULL DEFAULT 0,
ALTER COLUMN "sku" SET NOT NULL,
ALTER COLUMN "sku" SET DATA TYPE TEXT,
ALTER COLUMN "barcode" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "unit" SET DATA TYPE TEXT,
ALTER COLUMN "mainImageUrl" SET DATA TYPE TEXT,
ALTER COLUMN "notes" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ProductImage" ALTER COLUMN "imageUrl" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "isCompleted",
ADD COLUMN     "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "purchaseOrderId" TEXT,
ADD COLUMN     "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "taxRate" DECIMAL(6,4) NOT NULL DEFAULT 0,
ADD COLUMN     "warehouseId" TEXT NOT NULL,
ALTER COLUMN "documentNumber" SET DATA TYPE TEXT,
ALTER COLUMN "purchaseDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "supplierInvoice" SET DATA TYPE TEXT,
ALTER COLUMN "notes" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "PurchaseItem" ADD COLUMN     "batchNumber" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "retailPrice" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Stock" DROP COLUMN "reservedQty",
ADD COLUMN     "batchNumber" TEXT,
ADD COLUMN     "stockValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "warehouseId" TEXT NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StockMovement" DROP COLUMN "qtyAfter",
DROP COLUMN "qtyBefore",
DROP COLUMN "quantity",
ADD COLUMN     "balanceQty" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN     "batchNumber" TEXT,
ADD COLUMN     "quantityIn" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN     "quantityOut" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN     "totalValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "warehouseId" TEXT NOT NULL,
ALTER COLUMN "documentRef" SET DATA TYPE TEXT,
ALTER COLUMN "notes" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "code" TEXT NOT NULL,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "ruc" SET DATA TYPE TEXT,
ALTER COLUMN "contactName" SET DATA TYPE TEXT,
ALTER COLUMN "phone" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "address" SET DATA TYPE TEXT,
ALTER COLUMN "notes" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "SystemConfig" DROP CONSTRAINT "SystemConfig_pkey",
ALTER COLUMN "key" SET DATA TYPE TEXT,
ALTER COLUMN "description" SET DATA TYPE TEXT,
ADD CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key");

-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastLogin",
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "maxDiscount" DECIMAL(5,2),
ADD COLUMN     "minDiscount" DECIMAL(5,2),
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "warehouseId" TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "passwordHash" SET DATA TYPE TEXT,
ALTER COLUMN "phone" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "Courier";

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "Permission";

-- DropTable
DROP TABLE "ProductCategory";

-- DropTable
DROP TABLE "Quote";

-- DropTable
DROP TABLE "QuoteItem";

-- DropTable
DROP TABLE "Shipment";

-- DropTable
DROP TABLE "ShipmentHistory";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "QuoteStatus";

-- DropEnum
DROP TYPE "ShipmentStatus";

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isBranch" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Terminal" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "warehouseId" TEXT NOT NULL,
    "groupCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Terminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isReceived" BOOLEAN NOT NULL DEFAULT false,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requestedQty" DECIMAL(12,4) NOT NULL,
    "receivedQty" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "stockAtOrder" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "previousCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "retailPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" SERIAL NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "previousDebt" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL,
    "remainingDebt" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyLevel" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cardType" INTEGER NOT NULL DEFAULT 2,
    "discountFactor" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "pointsPerSol" INTEGER NOT NULL DEFAULT 1,
    "redemptionThreshold" DECIMAL(10,2) NOT NULL DEFAULT 10,
    "validityYears" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyCard" (
    "id" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "cardSerial" TEXT,
    "customerId" TEXT NOT NULL,
    "levelId" INTEGER NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceBonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pin" TEXT,
    "taxId" TEXT,
    "size" TEXT,
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTransaction" (
    "id" SERIAL NOT NULL,
    "cardId" TEXT NOT NULL,
    "documentRef" TEXT,
    "transactionType" "LoyaltyTxType" NOT NULL,
    "saleAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceAfter" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceBonusAfter" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "terminalCode" TEXT,
    "isVoid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyMovement" (
    "id" SERIAL NOT NULL,
    "cardId" TEXT NOT NULL,
    "documentRef" TEXT,
    "amountIn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountOut" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "runningBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saleAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "movementType" "LoyaltyTxType" NOT NULL,
    "terminalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyChargePlan" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chargeAmount" DECIMAL(10,2) NOT NULL,
    "bonusAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "gift" TEXT,
    "levelId" INTEGER,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyChargePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyCharge" (
    "id" SERIAL NOT NULL,
    "cardId" TEXT NOT NULL,
    "planId" INTEGER,
    "chargeAmount" DECIMAL(10,2) NOT NULL,
    "bonusAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "terminalCode" TEXT,
    "gift" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashShift" (
    "id" SERIAL NOT NULL,
    "shiftNumber" INTEGER NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "terminalId" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "shiftCode" TEXT NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "openingCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "salesTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "listPriceTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saleCount" INTEGER NOT NULL DEFAULT 0,
    "unitsSold" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "cashWithdrawn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "returnAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "returnCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftPayment" (
    "id" SERIAL NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "paymentMethodId" INTEGER NOT NULL,
    "totalCollected" DECIMAL(12,2) NOT NULL,
    "confirmedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ShiftPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashBookEntry" (
    "id" SERIAL NOT NULL,
    "accountCode" TEXT NOT NULL DEFAULT '000001',
    "entryDate" TIMESTAMP(3) NOT NULL,
    "amountIn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountOut" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "runningBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "movementType" TEXT NOT NULL,
    "description" TEXT,
    "documentRef" TEXT,
    "terminalCode" TEXT,
    "createdById" TEXT,
    "isSynced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashBookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "saleTime" TIMESTAMP(3) NOT NULL,
    "shiftId" INTEGER,
    "terminalId" TEXT,
    "cashierId" TEXT,
    "customerId" TEXT,
    "loyaltyCardId" TEXT,
    "taxId" TEXT,
    "invoiceSeries" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "SaleStatus" NOT NULL DEFAULT 'VALID',
    "refundFromId" TEXT,
    "notes" TEXT,
    "isSynced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" SERIAL NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "barcode" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "loyaltyDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(6,4) NOT NULL DEFAULT 0.18,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountBeforeTax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isPromotional" BOOLEAN NOT NULL DEFAULT false,
    "countsStats" BOOLEAN NOT NULL DEFAULT true,
    "warehouseId" TEXT,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalePayment" (
    "id" SERIAL NOT NULL,
    "saleId" TEXT NOT NULL,
    "paymentMethodId" INTEGER NOT NULL,
    "bankName" TEXT,
    "amountReceived" DECIMAL(12,2) NOT NULL,
    "amountApplied" DECIMAL(12,2) NOT NULL,
    "changeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "authCode" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stocktaking" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "countDate" TIMESTAMP(3) NOT NULL,
    "status" "StocktakingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "createdById" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stocktaking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StocktakingItem" (
    "id" SERIAL NOT NULL,
    "stocktakingId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "countedQty" DECIMAL(12,4) NOT NULL,
    "systemQty" DECIMAL(12,4) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "retailPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "batchNumber" TEXT,
    "notes" TEXT,

    CONSTRAINT "StocktakingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "fromWarehouseId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "totalValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isReceived" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3),
    "receivedById" TEXT,
    "createdById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransferItem" (
    "id" SERIAL NOT NULL,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sentQty" DECIMAL(12,4) NOT NULL,
    "receivedQty" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "batchNumber" TEXT,
    "notes" TEXT,

    CONSTRAINT "StockTransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditCollection" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "saleId" TEXT,
    "previousDebt" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL,
    "remainingDebt" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "isVoid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "shippingAddress" TEXT,
    "shippingDistrict" TEXT,
    "shippingCity" TEXT,
    "shippingRegion" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "StoreOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "trackingNumber" TEXT,
    "notes" TEXT,
    "saleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "StoreOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorePayment" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "methodName" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference" TEXT,
    "voucherUrl" TEXT,
    "status" "StorePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Terminal_code_key" ON "Terminal"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_documentNumber_key" ON "PurchaseOrder"("documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyLevel_code_key" ON "LoyaltyLevel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCard_cardNumber_key" ON "LoyaltyCard"("cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCard_customerId_key" ON "LoyaltyCard"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyChargePlan_code_key" ON "LoyaltyChargePlan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CashShift_shiftCode_key" ON "CashShift"("shiftCode");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_saleNumber_key" ON "Sale"("saleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Stocktaking_documentNumber_key" ON "Stocktaking"("documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_documentNumber_key" ON "StockTransfer"("documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCollection_documentNumber_key" ON "CreditCollection"("documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCollection_saleId_key" ON "CreditCollection"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreOrder_orderNumber_key" ON "StoreOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StoreOrder_saleId_key" ON "StoreOrder"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicInvoice_saleId_key" ON "ElectronicInvoice"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicInvoice_invoiceNumber_key" ON "ElectronicInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_code_key" ON "PaymentMethod"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_productId_warehouseId_key" ON "Stock"("productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_code_key" ON "User"("code");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Terminal" ADD CONSTRAINT "Terminal_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "LoyaltyLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "LoyaltyCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyMovement" ADD CONSTRAINT "LoyaltyMovement_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "LoyaltyCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyChargePlan" ADD CONSTRAINT "LoyaltyChargePlan_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "LoyaltyLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCharge" ADD CONSTRAINT "LoyaltyCharge_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "LoyaltyCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCharge" ADD CONSTRAINT "LoyaltyCharge_planId_fkey" FOREIGN KEY ("planId") REFERENCES "LoyaltyChargePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "Terminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPayment" ADD CONSTRAINT "ShiftPayment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "CashShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPayment" ADD CONSTRAINT "ShiftPayment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBookEntry" ADD CONSTRAINT "CashBookEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "CashShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "Terminal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_loyaltyCardId_fkey" FOREIGN KEY ("loyaltyCardId") REFERENCES "LoyaltyCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_refundFromId_fkey" FOREIGN KEY ("refundFromId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicInvoice" ADD CONSTRAINT "ElectronicInvoice_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stocktaking" ADD CONSTRAINT "Stocktaking_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stocktaking" ADD CONSTRAINT "Stocktaking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakingItem" ADD CONSTRAINT "StocktakingItem_stocktakingId_fkey" FOREIGN KEY ("stocktakingId") REFERENCES "Stocktaking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakingItem" ADD CONSTRAINT "StocktakingItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCollection" ADD CONSTRAINT "CreditCollection_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCollection" ADD CONSTRAINT "CreditCollection_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrder" ADD CONSTRAINT "StoreOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrder" ADD CONSTRAINT "StoreOrder_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrderItem" ADD CONSTRAINT "StoreOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StoreOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrderItem" ADD CONSTRAINT "StoreOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePayment" ADD CONSTRAINT "StorePayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StoreOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
