/*
  Warnings:

  - Added the required column `price` to the `order_item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StoreTrack"."order_item" ADD COLUMN     "price" DOUBLE PRECISION NOT NULL;
