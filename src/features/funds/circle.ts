import type { AppKit, BridgeChain, SwapChain } from '@circle-fin/app-kit'
import type { Connector } from 'wagmi'
import { appChain } from '@/lib/chain'

/**
 * Circle's App Kit powers the in-app Bridge (CCTP) and Swap on the Wallet page. It runs in the browser with the user's
 * own wallet, needs no key, and is loaded only when one of those tools is opened, so no other page pays for its size.
 * Nothing here moves funds by itself: every transfer starts from the user pressing a button after reading a quote.
 */

/** Arc's identifier in the kit for the network this deployment runs on, or null on a local test chain. */
export const ARC_NETWORK: 'Arc_Testnet' | 'Arc' | null = appChain.id === 5042002 ? 'Arc_Testnet' : appChain.id === 5042 ? 'Arc' : null

/** EURC on Arc, from Arc's contract address reference. Used only to show a balance. */
export const EURC_ADDRESS: `0x${string}` | null =
  appChain.id === 5042002 ? '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' : appChain.id === 5042 ? '0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1' : null

let kitPromise: Promise<AppKit> | null = null

export function loadKit(): Promise<AppKit> {
  kitPromise ??= import('@circle-fin/app-kit').then((m) => new m.AppKit())
  return kitPromise
}

interface Eip1193 {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

/** Builds the kit's wallet adapter from the connected wallet's own provider. */
export async function adapterFor(connector: Connector) {
  const [{ createViemAdapterFromProvider }, provider] = await Promise.all([import('@circle-fin/adapter-viem-v2'), connector.getProvider()])
  return createViemAdapterFromProvider({ provider: provider as Parameters<typeof createViemAdapterFromProvider>[0]['provider'] })
}

export interface EvmChain {
  chain: string
  name: string
  chainId: number
  explorerUrl: string
  rpcEndpoints: readonly string[]
  nativeCurrency: { name: string; symbol: string; decimals: number }
}

/** Asks the wallet to switch to a chain, adding it first when the wallet does not know it. */
export async function switchWalletTo(connector: Connector, chain: Pick<EvmChain, 'chainId' | 'name' | 'explorerUrl' | 'rpcEndpoints' | 'nativeCurrency'>): Promise<void> {
  const provider = (await connector.getProvider()) as Eip1193
  const chainId = `0x${chain.chainId.toString(16)}`
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] })
  } catch (err) {
    if ((err as { code?: number }).code !== 4902) throw err
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{ chainId, chainName: chain.name, nativeCurrency: chain.nativeCurrency, rpcUrls: chain.rpcEndpoints, blockExplorerUrls: [chain.explorerUrl] }],
    })
  }
}

/** Moves the wallet back to the network this site runs on. */
export function switchWalletHome(connector: Connector): Promise<void> {
  return switchWalletTo(connector, {
    chainId: appChain.id,
    name: appChain.name,
    explorerUrl: appChain.blockExplorers?.default.url ?? '',
    rpcEndpoints: appChain.rpcUrls.default.http,
    nativeCurrency: appChain.nativeCurrency,
  })
}

/** The chains USDC can be bridged in from, for the network family this site runs on (testnets on a testnet site). */
export async function bridgeSources(): Promise<EvmChain[]> {
  const kit = await loadKit()
  return (kit.getSupportedChains('bridge') as unknown as (EvmChain & { type: string; isTestnet: boolean })[])
    .filter((c) => c.type === 'evm' && c.isTestnet === appChain.testnet && c.chain !== ARC_NETWORK)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const asBridgeChain = (name: string) => name as BridgeChain
export const asSwapChain = (name: string) => name as SwapChain
