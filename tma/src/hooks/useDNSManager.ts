import { Address, Cell, beginCell } from "ton-core";
import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { Buffer } from "buffer";

import { AdnlAddress, StorageBagId } from "@/utils/validators";

const TRANSACTION_AMOUNT = "5000000";

const OPCODES = {
  CHANGE_DNS_RECORD: 0x4eb1f0f9,
  SET_NEXT_RESOLVER: 0xba93,
  SET_WALLET: 0x9fd3,
  SET_SITE: 0xad01,
  SET_STORAGE: 0x7473,
} as const;

const NAME_VALUES = {
  dns_next_resolver: BigInt("0x19f02441ee588fdb26ee24b2568dd035c3c9206e11ab979be62e55558a1d17ff"),
  wallet: BigInt("0xe8d44050873dba865aa7c170ab4cce64d90839a34dcfd6cf71d14e0205443b1b"),
  site: BigInt("0xfbae041b02c41ed0fd8a4efb039bc780dd6af4a1f0c420f42561ae705dda43fe"),
  storage: BigInt("0x49a25f9feefaffecad0fcd30c50dc9331cff8b55ece53def6285c09e17e6f5d7"),
} as const;

const createDnsRecordCell = (recordType: bigint, recordValue?: Cell): Cell => {
  const cell = beginCell()
    .storeUint(OPCODES.CHANGE_DNS_RECORD, 32)
    .storeUint(0, 64)
    .storeUint(recordType, 256);

  if (recordValue) {
    cell.storeRef(recordValue);
  }

  return cell.endCell();
};

export const useDNSManager = () => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  const sendTransaction = async (resolverAddress: string, payload: Cell) => {
    try {
      if (!wallet) throw new Error("_WalletNotConnectedError");

      try {
        Address.parse(resolverAddress);
      } catch {
        throw new Error("Invalid resolver address.");
      }

      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            address: resolverAddress,
            amount: TRANSACTION_AMOUNT,
            payload: payload.toBoc().toString("base64"),
          },
        ],
      });

    } catch (error: any) {
      if (error.message.includes("_WalletNotConnectedError")) {
        throw new Error("The wallet is not connected.");
      }
      if (error.message.includes("_UserRejectsError")) {
        throw new Error("Transaction rejected by the user.");
      }
      throw new Error("Failed to send transaction.");
    }
  };

  return {
    manager: {
      sendTransaction,

      createSiteBody: (adnlAddress: typeof AdnlAddress, isStorage = false): Cell =>
        createDnsRecordCell(
          NAME_VALUES.site,
          beginCell()
            .storeUint(isStorage ? OPCODES.SET_STORAGE : OPCODES.SET_SITE, 16)
            .storeBuffer(Buffer.from(adnlAddress.bytes))
            .storeUint(0, 8)
            .endCell()
        ),

      createStorageBody: (bagId: typeof StorageBagId): Cell =>
        createDnsRecordCell(
          NAME_VALUES.storage,
          beginCell()
            .storeUint(OPCODES.SET_STORAGE, 16)
            .storeBuffer(Buffer.from(bagId.bytes))
            .storeUint(0, 8)
            .endCell()
        ),

      createWalletBody: (walletAddress: string): Cell =>
        createDnsRecordCell(
          NAME_VALUES.wallet,
          beginCell()
            .storeUint(OPCODES.SET_WALLET, 16)
            .storeAddress(Address.parse(walletAddress))
            .storeUint(0, 8)
            .endCell()
        ),

      createResolverBody: (nextResolverAddress: string): Cell =>
        createDnsRecordCell(
          NAME_VALUES.dns_next_resolver,
          beginCell()
            .storeUint(OPCODES.SET_NEXT_RESOLVER, 16)
            .storeAddress(Address.parse(nextResolverAddress))
            .storeUint(0, 8)
            .endCell()
        ),

      createDeleteRecordBody: (recordType: keyof typeof NAME_VALUES): Cell =>
        createDnsRecordCell(NAME_VALUES[recordType]),
    },
  };
};
