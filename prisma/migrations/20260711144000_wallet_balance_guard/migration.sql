ALTER TABLE "Wallet"
ADD CONSTRAINT "Wallet_balance_non_negative" CHECK ("balance" >= 0);
