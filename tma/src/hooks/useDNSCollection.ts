import { sha256_sync } from "@ton/crypto";

import { Dictionary, beginCell, Cell, Address, StateInit, storeStateInit, contractAddress } from "@ton/core";
import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { useDNSManager } from "@/hooks/useDNSManager";

const TRANSACTION_AMOUNT = "50000000";

export const CONTRACT_CODES = {
  collection: "b5ee9c7241022f01000519000114ff00f4a413f4bcf2c80b0102016202210202cb03200201200417020120050f020120060c020120070b02ed0831c02497c0f8007434c0c05c6c2497c0f83e900c083c004074c7fc0309b000238f4c4c8d145071c17cb86441208402faf0802fbcb8333c028835d2483081fcb832082040fc2efcb8325e2a4230003cb832883c02fcb832c83e40504cfc04380e0134cfc9b0006497c27809a0841ed2d0b9aeb8c089a00809007c135f036c42820afaf08070fb02708210d372158c586d8306708010c8cb055007cf165005fa0215cb6a12cb1fcb3f226eb39458cf17019132e201c901fb0001fc8210e8a0abfeba8e3a135f036c42820afaf08070fb0270841f586d8306708010c8cb055007cf165005fa0215cb6a12cb1fcb3f226eb39458cf17019132e201c901fb00e0268210693d3950ba8e2a145f043431d0128210a8cb00ad708010c8cb055005cf1624fa0214cb6a13cb1fcb3f01cf16c98040fb00e0315163c7050a0080f2e19124c0038e15323303fa40304314c85005cf1613ccccccccc9ed54e0313202c0048e1402d4d430440302c85005cf1613ccccccccc9ed54e05f04840ff2f000113e910c30003cb853600201200d0e003f321b67409eaa43298c1400dbc088b000398ca6005bc880b2c1c85bb98c72742000111c3232c1c073c5b260020120101302012011120009341e35c860004b081be2320869548c1be073c5b24069bfa4c830bfe73214cc5be073c584b33240697a0c0c7420020120141601f700bc013d010c20bc1e1360bb8156946503e6578a7add8d37f7ac7e04d87ff808defd19f6684ae4328060c1fd03dbe84c3c013e0a3e910c7c00a2c4ba22c4ba22cdd1bdba0990c4c9809bc17c017c00e2c4be22c4ba22cdc1b99e09544e151210dbc1bc017c00e2c4be1418a2c4be1401a2c4ba22d1a9cdbdba1bc22015000af005f00312002d007232fffe0a33c5b25c083232c044fd003d0032c03260020120181f020120191c0201201a1b001b3e401d3232c084b281f2fff2742000331c27c074c1c07000082ce500a98200b784b98c4830003cb432e00201201d1e004f3223880875d244b5c61673c58875d2883000082ce6c070007cb832c0b50c3400a44c78b98c727420007f1c0875d2638d572e882ce38b8c00b4c1c8700b48f0802c0929be14902e6c08b08bc8f04eac2c48b09800f05ec4ec04ac6cc82ce500a98200b784f7b99b04aea00015d76a2687d206a6a6a6a1840087d04fc01dc087c02321400f3c5b27201340533c5b25c3e095c7232c7f2cfd401b3c5853304f31c7e8084f2c0325de0063232c1540133c59c3e8084f2daf3333260103ec02020120222a020120232702016224250037ae65f8063620b81064459ba37b74678b6583816809678b6583e4e84001bdadae98f8061a2d816800e800f8033689c1784151a9bff86de73f761aeb4f6e1d0c4f7378bec179a9d2a9fcd54b6585f1e74480c183fa0bc1783082eb663b57a00192f4a6ac467288df2dfeddb9da1bee28f6521c8bebd21f1e80c183fa0bc026005c82f070e5d7b6a29b392f85076fe15ca2f2053c56c2338728c4e33c9e8ddb1ee827cc018307f41770c8cb07f400c90201202829001fb5dafe01828be09a1a61fa61ff480610001db4f47e0182048be09e00ee003e01100201202b2c0011b905bf00c5f037f0280201202d2e000fb64a5e018d883a10009db46186041ae92f152118001e5c08c41ae140f800043ae938010a4216126b6f0dbc0412a03a60e6203bc43e012a245ae3061f2030401752791961e030402cf47da87b19e2d920322f122e1c4254003048178d53",
  item: "b5ee9c72410216010003af000114ff00f4a413f4bcf2c80b01020162020f0202ce030c020120040b02f30c8871c02497c0f83434c0c05c6c2497c0f83e90087c007e900c7e800c5c75c87e800c7e800c1cea6d0000b4c7f4cffc0081acf8c08a3000638f440e17c20ccc4871c17cb8645c20843a282aff885b60101c20043232c15401f3c594017e808572da84b2c7f2cfc89bace51633c5c0644cb88072407ec0380a20050701f65f03323435355233c705f2e1916d70c8cb07f400c904fa40d4d420c701c0008e42fa00218e3a821005138d9170c82acf165003cf162604503373708010c8cb055007cf165005fa0215cb6a12cb1fcb3f226eb39458cf17019132e201c901fb00915be29130e2820afaf08070fb027082107b4b42e62703076d8306060054708010c8cb055007cf165005fa0215cb6a12cb1fcb3f226eb39458cf17019132e201c901fb004503f00302e082105fcc3d14ba8e8a3810394816407315db3ce03a3a2682102fcb26a2ba8e3e3035365b347082108b77173504c8cbff58cf164430128040708010c8cb055007cf165005fa0215cb6a12cb1fcb3f226eb39458cf17019132e201c901fb00e0350582104eb1f0f9bae3025f08840ff2f0080a01f65137c705f2e191fa4021f001fa40d20031fa000c820afaf080a121945315a0a1de22d70b01c300209206a19136e220c2fff2e192218e3dc8500acf16500ccf16821005138d9171245146104f50f2708010c8cb055007cf165005fa0215cb6a12cb1fcb3f226eb39458cf17019132e201c901fb0094102c395be20209007e8e3428f00148508210d53276db016d71708010c8cb055007cf165005fa0215cb6a12cb1fcb3f226eb39458cf17019132e201c901fb0093303436e25504f003007a5153c705f2e19101d3ff20d74ac20008d0d30701c000f2e19cf404300898d43040178307f417983050068307f45b30e270c8cb07f400c910355512f00300113e910c30003cb853600201200d0e00433b513434fffe900835d27080271fc07e903535350c04118411780c1c165b5b5b5b600023017232ffd40133c59633c5b33333327b55200201201011004bbc265f801282b2f82b8298064459ba37b74678b658382680a678b09e58380e8678b6583e4e840201201213000db8fcff0023031802012014150011b64a5e0042cbe0da1000c7b461843ae9240f152118001e5c08de004204cbe0da1a60e038001e5c339e8086007ae140f8001e5c33b84111c466105e033e04883dcb11fb64ddc4964ad1ba06b879240dc23572f37cc5caaab143a2fffbc4180012660f003c003060fe81edf4260f00304c1dd84e",
} as const;

type CollectionContent = {
  name: string;
  image: string;
  description: string;
  prefix_uri: string;
};

type Royalty = {
  base: number;
  factor: number;
  address: Address;
};

type CollectionData = {
  owner: Address;
  content: Cell;
  royalty: Cell;
  domain: Cell;
};

export function toSha256(s: string): bigint {
    return BigInt('0x' + sha256_sync(s).toString('hex'))
}

function toTextCell(s: string): Cell {
    return beginCell().storeUint(0, 8).storeStringTail(s).endCell()
}

function createCollectionContentCell(content: CollectionContent): Cell {
    const collectionContentDict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
      .set(toSha256("name"), toTextCell(content.name))
      .set(toSha256("image"), toTextCell(content.image))
      .set(toSha256("description"), toTextCell(content.description))
      .set(toSha256("prefix_uri"), toTextCell(content.prefix_uri));

    return beginCell().storeUint(0, 8).storeDict(collectionContentDict).endCell();
}

const createRoyaltyCell = (royalty: Royalty): Cell => {
  return beginCell()
    .storeUint(royalty.factor, 16)
    .storeUint(royalty.base, 16)
    .storeAddress(royalty.address)
    .endCell();
};

const createCollectionDataCell = (data: CollectionData): Cell => {
  return beginCell()
    .storeAddress(data.owner)
    .storeRef(data.content)
    .storeRef(Cell.fromHex(CONTRACT_CODES.item))
    .storeRef(data.royalty)
    .storeRef(data.domain)
    .endCell();
};

const createCollectionStateInit = (data: CollectionData): Cell => {
  const init = {
      code: Cell.fromHex(CONTRACT_CODES.collection),
      data: createCollectionDataCell(data)
  } satisfies StateInit;

  return beginCell()
    .store(storeStateInit(init))
    .endCell();
};

const createCollectionAddress = (data: CollectionData): Address => {
  return contractAddress(0, {
    code: Cell.fromHex(CONTRACT_CODES.collection),
    data: createCollectionDataCell(data),
  });
};

const createCollectionStateAndAddress = (
  owner: string,
  content: CollectionContent,
  royalty: Royalty,
  domain: string
) => {
  const ownerAddress = Address.parse(owner);
  const royaltyCell = createRoyaltyCell(royalty);
  const contentCell = createCollectionContentCell(content);
  const domainCell = beginCell().storeStringTail(domain).endCell();

  const collectionData: CollectionData = {
    owner: ownerAddress,
    content: contentCell,
    royalty: royaltyCell,
    domain: domainCell,
  };

  const stateInit = createCollectionStateInit(collectionData);
  const collectionAddress = createCollectionAddress(collectionData);

  return {
    stateInit: stateInit.toBoc().toString("base64"),
    address: collectionAddress.toString(),
  };
};

const formatDomainName = (domain: string): string =>
  domain.charAt(0).toUpperCase() + domain.slice(1).toLowerCase();

export const useDNSCollection = () => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const { manager } = useDNSManager();

  const sendTransactions = async (messages: { address: string; amount: string; payload: string; stateInit?: string }[]) => {
    if (!wallet) throw new Error("Wallet not connected.");

    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages,
      });
    } catch (error: any) {
      throw new Error(error.message || "Failed to send transactions.");
    }
  };

  const deployCollection = async (
    ownerAddress: string,
    royaltyAddress: string,
    domain: string,
    resolverAddress: string
  ) => {
    if (!wallet) throw new Error("Wallet not connected.");

    const formattedDomain = formatDomainName(domain);

    const content: CollectionContent = {
      name: `${formattedDomain} DNS Domains`,
      image: `https://dns.ness.su/api/ton/${domain.toLowerCase()}.png`,
      description: `*.${domain.toLowerCase()}.ton domains`,
      prefix_uri: "https://dns.ness.su/api/ton/",
    };

    const deployPayload = beginCell().storeUint(1, 32).storeUint(0, 64).endCell();
    const royalty: Royalty = { base: 100, factor: 5, address: Address.parse(royaltyAddress) };
    const { stateInit, address: collectionAddress } = createCollectionStateAndAddress(ownerAddress, content, royalty, domain);

    const messages = [
      {
        address: collectionAddress,
        amount: TRANSACTION_AMOUNT,
        payload: deployPayload.toBoc().toString("base64"),
        stateInit,
      },
      {
        address: resolverAddress,
        amount: TRANSACTION_AMOUNT,
        payload: manager.createResolverBody(collectionAddress).toBoc().toString("base64"),
      },
    ];

    await sendTransactions(messages);
  };

  return {
    collection: {
      deployCollection,
    },
  };
};