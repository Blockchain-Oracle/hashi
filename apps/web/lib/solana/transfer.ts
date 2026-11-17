import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import { type Connection, PublicKey, Transaction } from '@solana/web3.js'

/**
 * A USDC or USDT transfer on Solana to a NEAR Intents deposit address. The deposit address is a fresh wallet, so
 * its token account usually does not exist yet: the transaction creates it first (idempotently: a no-op if it
 * exists), which is the token-account rent counted in the route's network fee.
 */
export async function splTransferTransaction({
  connection,
  owner,
  mint,
  to,
  amount,
  decimals,
}: {
  connection: Connection
  owner: string
  mint: string
  to: string
  amount: bigint
  decimals: number
}): Promise<Transaction> {
  const ownerKey = new PublicKey(owner)
  const mintKey = new PublicKey(mint)
  const toKey = new PublicKey(to)
  const from = getAssociatedTokenAddressSync(mintKey, ownerKey)
  // A deposit address may be a program-derived address, which has no private key; allow it as an owner.
  const destination = getAssociatedTokenAddressSync(mintKey, toKey, true)
  const transaction = new Transaction()
    .add(createAssociatedTokenAccountIdempotentInstruction(ownerKey, destination, toKey, mintKey))
    .add(createTransferCheckedInstruction(from, mintKey, destination, ownerKey, amount, decimals))
  transaction.feePayer = ownerKey
  transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash
  return transaction
}
