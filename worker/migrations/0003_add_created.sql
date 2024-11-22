-- RedefineTables
PRAGMA defer_foreign_keys= ON;
PRAGMA foreign_keys= OFF;
CREATE TABLE "new_Payment"
(
  "id"                         TEXT     NOT NULL PRIMARY KEY,
  "currency"                   TEXT     NOT NULL,
  "totalAmount"                INTEGER  NOT NULL,
  "invoicePayload"             TEXT     NOT NULL,
  "subscriptionExpirationDate" DATETIME NOT NULL,
  "isFirstRecurring"           BOOLEAN  NOT NULL,
  "telegramPaymentChargeId"    TEXT     NOT NULL,
  "createdAt"                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "groupId"                    TEXT,
  CONSTRAINT "Payment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("currency", "groupId", "id", "invoicePayload", "isFirstRecurring",
                           "subscriptionExpirationDate", "telegramPaymentChargeId", "totalAmount")
SELECT "currency",
       "groupId",
       "id",
       "invoicePayload",
       "isFirstRecurring",
       "subscriptionExpirationDate",
       "telegramPaymentChargeId",
       "totalAmount"
FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment"
  RENAME TO "Payment";
PRAGMA foreign_keys= ON;
PRAGMA defer_foreign_keys= OFF;
