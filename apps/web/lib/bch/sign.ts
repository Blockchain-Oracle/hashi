import { binToHex, decodeTransaction, hexToBin } from '@bitauth/libauth'
import { sourceOutputToRelay } from '@wizardconnect/core/hdwalletv1-serialize'
import type { DappConnectionManager } from '@wizardconnect/dapp'
import type { RouterBuild } from '@/lib/providers/cauldron'
import { outpointKey, type WalletAddress } from './wallet'

/**
 * Ask the connected wallet to sign a Cauldron Router build over WizardConnect, the way ParyonUSD's app and the
 * WizardConnect docs do it: the unsigned transaction as hex; one source output per input (pool inputs keep the
 * Router's unlocking bytecode, wallet inputs are empty), serialised with `sourceOutputToRelay`; `inputPaths` only
 * for the wallet's own inputs; `broadcast: false`, because Hashi broadcasts itself over Electrum.
 */
export async function signRouterBuild(
  manager: DappConnectionManager,
  build: RouterBuild,
  /** The wallet address behind each funding coin, keyed by `txid:vout`. */
  owners: Map<string, WalletAddress>,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const decoded = decodeTransaction(hexToBin(build.unsigned_tx_hex))
  if (typeof decoded === 'string') throw new Error(`The Router's transaction could not be read: ${decoded}`)

  const sourceOutputs = decoded.inputs.map((input, i) => {
    const prevout = build.source_outputs[i]
    if (!prevout) throw new Error(`The Router sent no source output for input ${i}`)
    return sourceOutputToRelay({
      outpointTransactionHash: input.outpointTransactionHash,
      outpointIndex: input.outpointIndex,
      unlockingBytecode: input.unlockingBytecode,
      sequenceNumber: input.sequenceNumber,
      valueSatoshis: BigInt(prevout.value),
      lockingBytecode: hexToBin(prevout.locking_script_hex),
      ...(prevout.token
        ? { token: { category: hexToBin(prevout.token.category), amount: BigInt(prevout.token.amount) } }
        : {}),
    })
  })

  const inputPaths = build.inputs_to_sign.map((i): [number, string, number] => {
    const input = decoded.inputs[i]
    if (!input) throw new Error(`The Router asked to sign input ${i}, which does not exist`)
    const owner = owners.get(outpointKey(binToHex(input.outpointTransactionHash), input.outpointIndex))
    if (!owner) throw new Error(`Input ${i} is not one of this wallet's coins`)
    return [i, owner.path, owner.index]
  })

  const response = await manager
    .signTransaction(
      {
        transaction: {
          transaction: build.unsigned_tx_hex,
          sourceOutputs,
          broadcast: false,
          userPrompt: prompt,
        },
        inputPaths,
      },
      signal ? { signal } : undefined,
    )
    .catch((cause: unknown) => {
      // Right after a refresh the stored session's relay is still coming back: say what to do, not the library's words.
      if (cause instanceof Error && /not connected/i.test(cause.message))
        throw new Error('Reconnecting to your wallet. Open it, then try again.')
      throw cause
    })
  if (response.error) throw new Error(response.error)
  return response.signedTransaction
}
