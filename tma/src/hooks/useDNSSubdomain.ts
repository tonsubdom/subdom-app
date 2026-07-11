import { beginCell, Cell, Address, contractAddress } from "@ton/core";
import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { CONTRACT_CODES } from "./useDNSCollection";

const TRANSACTION_AMOUNT = "200000000";

const createCommentCell = (comment: string): Cell => {
    return beginCell()
      .storeUint(0, 32)
      .storeStringTail(comment)
      .endCell()
};

const getItemAddress = (collectionAddress: string, domain: string): Address => {
    const data = beginCell()
      .storeBuffer(beginCell().storeStringTail(domain).endCell().hash())
      .storeAddress(Address.parse(collectionAddress))
      .endCell();
    return contractAddress(0, {
        code: Cell.fromHex(CONTRACT_CODES.item),
        data: data,
    });
};

export const useDNSSubdomain = () => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  const sendTransaction = async (collectionAddress: string, comment: string) => {
    try {
      if (!wallet) throw new Error("_WalletNotConnectedError");

      try {
        Address.parse(collectionAddress);
      } catch {
        throw new Error("Invalid collection address.");
      }

      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            address: collectionAddress,
            amount: TRANSACTION_AMOUNT,
            payload: createCommentCell(comment).toBoc().toString("base64"),
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
    subdomain: {
      sendTransaction,
      getItemAddress,
    },
  };
};
