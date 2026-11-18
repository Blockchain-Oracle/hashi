// Compiles Hashi's CashScript contracts into the artifacts the app reads (it never ships the compiler).
//
//     pnpm --filter web contracts
//
// A test (lib/bch/arrival/contract.test.ts) fails if a committed artifact no longer matches its source.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { asmToBytecode } from '@cashscript/utils'
import { compileFile } from 'cashc'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * The fields the app's encoder uses (lib/bch/arrival/contract.ts). The bytecode goes as hex, not ASM, so the browser
 * reads bytes and needs no table of opcode names.
 */
function artifactForApp({ contractName, constructorInputs, abi, bytecode, compiler }) {
  return {
    contractName,
    constructorInputs,
    abi,
    bytecodeHex: Buffer.from(asmToBytecode(bytecode)).toString('hex'),
    compiler: { name: compiler.name, version: compiler.version },
  }
}

const CONTRACTS = [
  {
    source: join(here, '../contracts/swap-on-arrival.cash'),
    artifact: join(here, '../lib/bch/arrival/swap-on-arrival.artifact.json'),
  },
]

for (const { source, artifact } of CONTRACTS) {
  const compiled = compileFile(source)
  // Only what the app reads: its bytecode and the order of its parameters. The source, debug maps and compile time
  // stay out (smaller pages, and an artifact that only changes when the contract does).
  const lean = artifactForApp(compiled)
  writeFileSync(artifact, `${JSON.stringify(lean, null, 2)}\n`)
  console.log(`${compiled.contractName}: ${compiled.bytecode.split(' ').length} ops → ${artifact}`)
}
