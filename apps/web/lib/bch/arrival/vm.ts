import { createVirtualMachineBch2026, type Output, type TransactionCommon } from '@bitauth/libauth'

/**
 * The Bitcoin Cash VM (2026 rules, mainnet since May 2026), loaded only when a swap contract's transaction is about
 * to be sent: it is the heaviest part of this feature, so pages that never send one never download it.
 */
let vm: ReturnType<typeof createVirtualMachineBch2026> | undefined

/** The VM's verdict on a whole transaction: true, or why the network would refuse it. */
export function verifyInVm(transaction: TransactionCommon, sourceOutputs: Output[]): true | string {
  vm ??= createVirtualMachineBch2026()
  return vm.verify({ sourceOutputs, transaction })
}
