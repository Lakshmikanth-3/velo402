import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";

const network =
  (process.env.NEXT_PUBLIC_SUI_NETWORK as "testnet" | "mainnet" | "devnet") ??
  "testnet";

export const suiClient = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl(network),
  network,
});

export const PACKAGE_ID = process.env.NEXT_PUBLIC_VELO402_PACKAGE_ID!;
export const TREASURY_ID = process.env.NEXT_PUBLIC_TREASURY_ID!;
export const POLICY_CAP_ID = process.env.NEXT_PUBLIC_POLICY_CAP_ID!;
export const NETWORK = network;
