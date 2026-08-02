// src/utils/whitelistUtils.ts

// Whitelist map - адреса в тестнет формате (начинаются с 0Q)
export const whitelistMap: Record<string, string> = {
  "0QBHTJVZSECcnS3fgcz0rUSN5rE8GEks5H3CI7WfPdZ_mz0N": "@Topruble",
  "0QDCcBoknzHnE0GXLTsIrTLT4gg9yQBysWsEgNc_tsmGp9y-": "@bajmer",
  "0QDlKUG4_csDFXK7CQ9a_OPZSJzLRdWuyIiW-gddA7NMg7Uo": "@p_jes",
  "0QALVvEkTZcRSy-Ud1taY9wF6SzhhKUo77hg0QifSH46cNzW": "@script_durova",
  "0QDmXhDxjd_pgFv3JLc8GtVW-VyxmhDt6xodj2i4x_Cv2Gvv": "@vadvek",
  "0QAfY-ZxtLJ3GySgCC56YTKE9b8UHbiFWcM_iLMig74H4kEO": "@complextech",
  "0QCaUVddISJFAbWe9mFX8I6wVN-8K0RFH5dSeF4z5Fj3DMnk": "@citiestime",
  "0QD12MIx5kY2YphBDZ8aZJ10scX76de6yU2FZpfQRT8xQoRs": "@dragonbronz",
  "0QDRdwmx10Yzg5HaCvDjvHdV6Xy0ivYnE8T6Qmj_BA-Bp_mm": "@Muxa84",
  "0QDzS2QT61jEkUTH1aTiPrw4ujThefsfRtkxxLzBJZo9yAmD": "@alexsandr",
  "0QBEin2eaVTyEgyhFRV7QwLMHrcicMwyf7kdOfcCGR9CpLPa": "@NoVsevolod",
  "0QAuvji0FMqR40SfBjfjDJAMiyDCDbdk3TV1qCqmZrQh4g66": "@ocius",
  "0QDXke_wyJe5VCGI59VPACPKzdw-ZhkqEqwlBBxbkwU7K3nA": "@real_kudrya",
  "0QA4D9kI_A_7QAyC840AKAFwrOoyY5aOAPj-UI21s5Zgj1kR": "@DragonRiot",
  "0QDYrxfHPuGs94P_6gXNco-8hAumgS9TyYAPxyJ6YnXNIjB3": "@missGrafin",
  "0QD-tB_rdezUCre04eiSQq43FDCgWPpfscJXtNmRrr3vAcq_": "@draco_ceo",
  "0QCiX5nRPzKpNDbo42JmUkVJt1V0n_UBycX8TxCVe8tOpnra": "@SohoAntony",
  "0QA29QkUF1-wLUQCu5VYadM5qPfFGdTpzrC7CPSJZ7EtWP4w": "@ifyes",
  "0QC-3ilVr-W0Uc3pLrGJElwSaFxvhXXfkiQA3EwdVBHNNQ1j": "@shonness",
  "0QBYiTsEjInTdAcTHZ6B9lJNNE4NANfpIDOoVviE3P70C4BV": "@zkproof",
  "0QC9AevlAcsQk6uzXcWNMhmKZng5HEfXFMrRFr7T_EXQ1EL8": "@Pamblus",
  "0QD_xCETA7e2GpRzEtgZXg9huG8PeBQKYVabdotIlxviVNrV": "@bulliiing",
  "0QAFdwqiHZuqeM26CmAIviJDoeRjGdk-FhDM96rW9QFK-Yan": "@JayP89",
  "0QB5HQfjevz9su4ZQGcDT_4IB0IUGh5PM2vAXPU2e4O6_Tvs": "@botpult",
  "0QDVCyacpRdCX4nmbTxYEGUvxZwa_uE63FXZc90nqvcoI01Z": "@ethmacho",
  "0QBay08MLWJmp-ATio0h1NDblQqGjviqWICad4e_Bc9s0hJb": "@hsslbch",
  "0QDnUWuHIpbUSudkJdH3XgvisRRuCFUqZWRtiBM0y0u-Plsk": "@troman29",
  "0QAZsKWLxir_p9u1p_HrcnmWP4Zh2KJpKEFAKZOJRJCl5yBb": "@crazyministr",
  "0QAKzwU0Y1TqG_ksOlVLk7YNicC-P3ASEyE2zIeO1TlfBMHo": "@aleksy",
  "0QCcQqkrYOnzcET9V9-1pnfaxIqNFAygyjd3ua3c4HU-5RBc": "@ton0098",
  "0QCjkO_CsRcHNLGCp8boSNuGutegiE-Ilhp3okGCuqyEc0y2": "@freebie_life",
};

// export const mainnetWhitelistMap: Record<string , string> = {
//   "UQCZ_B7XM1B6ZSCxLcjiGVj88XS2i3EBuwI4hH_vB-BgLNzl": "@dragonbronz",
//   "UQAuZNHfnPyT3kgZi2FLASIZ-G0Ba8FYSQIlf5-FtwlmgE9B": "@ethmacho",
//   "UQAc0wLqdhPSbTOyZ_TQ9M1HtPhGWxyYEJwz8xIhO7n6q2p7": "@vadvek",
//   "UQAiSKXDrGTNMad4YZmkFYYH7GWeH4snBd5Ih-Z5Re3MLQLm": "@ushakov53",
//   "UQBIZyBV_FPVJ9Fr4MB7OoXtypGZDdeaLdAzV3LMKR062al_": "@NTRVV",
//   "UQAAJlaAvu5I8BJgThs4RwlbOPRiDa_f3_ZRDaTyD_O9GdQY": "@domainer",
//   "UQDh_zH3JHJRTGkl9omz0Z3RoOfksLCz6O5wFyfgpd4f0egj": "@pinbaker",
//   "UQABJR9FO3bIew04W2Hq_B-pmEtKaCu--k74pI-D-i0tVKxl": "@artosten",
//   "UQBkejKCIoXHDgy-c6zSwybT-jJUHhMApPMKnA-XwrhAyy6C": "@rece2021",
//   "UQANtyTiJuWgo5cTdrVlzpTzhYD3Heg3ssPoeAW2dM2v6nR1": "@rare",
//   "EQCjr5VBeLGThuNknozFkjcTX6EKf5t9IVRGp0nllx02Eg7o": "@crazyministr",
//   "UQAWfbqio67-yW4iKaSrZxMPFfzHD8QFGWf-BNUEtuJRdVWx": "@SellerDNS",
//   "UQAfAAGTOeDQoQD7sUXRN1EFJ0mMBbeMmzNwBEvTx-euut2a": "@Lunanegro",
//   "UQA22jqDoD_wxjSLWvjKSvVtmjrxl-lA3BjKjTckwORrgelw": "@alkury",
//   "UQBHWbhbnVK2_b5_hP6fP9zIYXyZ6u8uHajl_U40jWuiYpWk": "@ifyes",
//   "UQAm70O8VrpJpaUMdh33hu6UkPs53cQBJDJhgKcvzUzLse0P": "@Hulkdns",
//   "UQACbFCUL80l1Po4cqhyGZVF82mXix3sj7qdb7lU5o644ZVy": "@dvl_95",
//   "UQBCoAhAC3LhX8bt2uDWUJHqQWk5n-87_Ou1NwLuAo0K4tkG": "@moroz",
//   "UQByPru0rxKYhut46wQfpUBO7ExpW2t0l-W17WEv4MTxaCbW": "@niger",
//   "UQDw8pu9ih6-Mm3lYTdViNWJRP3QVESFHtCM_SFa7jQyILcv": "@alliexchange",
//   "UQCDrgGaI6gWK-qlyw69xWZosurGxrpRgIgSkVsgahUtxZR0": "@nessshon",
//   "UQDtacmgsrjcqubObwU9FLuWCMxMCucDDOEX2jljLZLubEL-": "@citiestime",
//   "UQANRni0nJQSw2-mFy2lhTsuZCgjiPTyUMC34BBHl0vfIMnI": "@ton0098",
//   "UQD_fKf3QUd42TFd6sUrzSQ205tGKQChVzFVU813qgGpS3Fg": "@Muxa84",
//   "UQBDRBSeWaNTUKK6XJveBgzDl2PJoc537wax-63T2s205BnM": "@complextech",
//   "UQADjndqJEpJlyA7DPrb-zsBvu_A_UaghNBLJV4IWLtNmdjs": "@bajmer",
//   "UQBHTJVZSECcnS3fgcz0rUSN5rE8GEks5H3CI7WfPdZ_m4aH": "@Topruble",
//   "UQCFsVc8MnJ6PwU6Li8EFX1vplzc0f4GREt9UsyKNSdxRph4": "@hsslbch",
//   "UQDU4mzZk17I9C1aQhjDVoD2XcXrf3mVrPH6YHP7s8TUFaOR": "@noVsevolod",
//   "UQDSr6DER5xov7iDDMu0nWdu5gbnK2NPDtz52DSf8JHo8wMZ": "@real_kudrya"
// };

export const mainnetWhitelistMap: Record<string , string> = {
  "0:99fc1ed733507a6520b12dc8e21958fcf174b68b7101bb0238847fef07e0602c": "@dragonbronz",
  "0:2e64d1df9cfc93de48198b614b012219f86d016bc1584902257f9f85b7096680": "@ethmacho",
  "0:1cd302ea7613d26d33b267f4d0f4cd47b4f8465b1c98109c33f312213bb9faab": "@vadvek",
  "0:2248a5c3ac64cd31a7786199a4158607ec659e1f8b2705de4887e67945edcc2d": "@ushakov53",
  "0:48672055fc53d527d16be0c07b3a85edca91990dd79a2dd0335772cc291d3ad9": "@NTRVV",
  "0:00265680beee48f012604e1b3847095b38f4620dafdfdff6510da4f20ff3bd19": "@domainer",
  "0:e1ff31f72472514c6925f689b3d19dd1a0e7e4b0b0b3e8ee701727e0a5de1fd1": "@pinbaker",
  "0:01251f453b76c87b0d385b61eafc1fa9984b4a682bbefa4ef8a48f83fa2d2d54": "@artosten",
  "0:647a32822285c70e0cbe73acd2c326d3fa32541e1300a4f30a9c0f97c2b840cb": "@rece2021",
  "0:0db724e226e5a0a3971376b565ce94f38580f71de837b2c3e87805b674cdafea": "@rare",
  "0:a3af954178b19386e3649e8cc59237135fa10a7f9b7d215446a749e5971d3612": "@crazyministr",
  "0:167dbaa2a3aefec96e2229a4ab67130f15fcc70fc4051967fe04d504b6e25175": "@SellerDNS",
  "0:1f00019339e0d0a100fbb145d137510527498c05b78c9b3370044bd3c7e7aeba": "@Lunanegro",
  "0:36da3a83a03ff0c6348b5af8ca4af56d9a3af197e940dc18ca8d3724c0e46b81": "@alkury",
  "0:4759b85b9d52b6fdbe7f84fe9f3fdcc8617c99eaef2e1da8e5fd4e348d6ba262": "@ifyes",
  "0:098507db36d99a5a9628815a28e7db25a71c3c60bbf71e5bb138e3cf1c78549c": '@tondnser',
  "0:26ef43bc56ba49a5a50c761df786ee9490fb39ddc40124326180a72fcd4ccbb1": "@Hulkdns",
  "0:026c50942fcd25d4fa3872a872199545f369978b1dec8fba9d6fb954e68eb8e1": "@dvl_95",
  "0:42a008400b72e15fc6eddae0d65091ea4169399fef3bfcebb53702ee028d0ae2": "@moroz",
  "0:723ebbb4af129886eb78eb041fa5404eec4c695b6b7497e5b5ed612fe0c4f168": "@niger",
  "0:f0f29bbd8a1ebe326de561375588d58944fdd05444851ed08cfd215aee343220": "@alliexchange",
  "0:83ae019a23a8162beaa5cb0ebdc56668b2eac6c6ba51808812915b206a152dc5": "@nessshon",
  "0:ed69c9a0b2b8dcaae6ce6f053d14bb9608cc4c0ae7030ce117da39632d92ee6c": "@citiestime",
  "0:0d4678b49c9412c36fa6172da5853b2e64282388f4f250c0b7e01047974bdf20": "@ton0098",
  "0:ff7ca7f7414778d9315deac52bcd2436d39b462900a157315553cd77aa01a94b": "@Muxa84",
  "0:4344149e59a35350a2ba5c9bde060cc39763c9a1ce77ef06b1fbadd3dacdb4e4": "@complextech",
  "0:038e776a244a4997203b0cfadbfb3b01beefc0fd46a084d04b255e0858bb4d99": "@bajmer",
  "0:474c955948409c9d2ddf81ccf4ad448de6b13c18492ce47dc223b59f3dd67f9b": "@Topruble",
  "0:85b1573c32727a3f053a2e2f04157d6fa65cdcd1fe06444b7d52cc8a35277146": "@hsslbch",
  "0:d4e26cd9935ec8f42d5a4218c35680f65dc5eb7f7995acf1fa6073fbb3c4d415": "@noVsevolod",
  "0:d2afa0c4479c68bfb8830ccbb49d676ee606e72b634f0edcf9d8349ff091e8f3": "@real_kudrya",
  "0:e943613cc02b06e8e56aff90775660a4743f2046b8f5db8be1fb9ae1dda2947c": "@p_jes",
  "0:656a36632702a953f409f7ea1fbe996f04566b910edd07c4f4e2d24a469926a6": "@i0742",
  "0:76f53413a83e6df92c48dfaf524490e1b0f7f07a5464af4e78e9a26a0c84d7f2": "@Johny_beee",
  "0:8873c9c956f0323a97243c8db816c831f48708dc1b46a3cd67ea222a5d4d1ab2": "@Pamblus",
  "0:70cc04fa918c12a6f0b0a993f79f4eaba57b703d931ae206b5e9df03c972937f": "@overworldx",
  "0:3f79f5e19f7922de53159299660a07c448c6bd92829d49e1e303a1a6b9fabd37": "@script_durova",
  "0:91257b3e0eb645719c94e8961a2cb15c551a11ccd4969cb4b4c0bfde6a671a08": "@prizm",
  "0:e9184734f979544bf46c652c5c43746fab438b883890b43ff648ad8a171368de": "@naiko",
  "0:457343e6b34f59703309aaa111f99ab57b8b37969adba1e6dbb125e8fbbcf365": "@aleksy",
  "0:7fe758085ffda574a853cf7a47b17218a9ec3f7e157c219ef2886cd46daba3c8": "@paull",
  "0:871fac731a75fa665294b750d6f0a0ab1df93c642f1ff840b0f3c9b3c044c3e7": "@dogpY",
  "0:f84feca8cba5ef45eab0fd84bcf53e325804432764945eeb892a6e0623f9bdb2": "@missGrafin",
  "0:12d1d750ecc0c4b39beb13e57536c44a3fe65f18c761326d5ccb5bb7cbaa07c5": "@JayP89",
  "0:3b2a1a130a51bd411ec3c0dd5118091621153474da7f47c17ad79cb93e210640": "@JayP89",
  "0:a390efc2b1170734b182a7c6e848db86bad7a0884f88961a77a24182baac8473": "@freebie_life",
  "0:231cec49ebeb350554e901f1de53cd4cf7e3ddf3113f156830f3a7c025fa8451": "@vbetonespbru",
  "0:b5521abd6b37c764ef773a982a0f5edacafae1b0cf4a8932b4620d3521388b1b": "@standabrill",
  "0:62485bcb0eb67b52d9baae64b2ebc224f0ae6361cac088aefa45a03a6b7b100a": "@toptalcommander",
};


//для тестнета
/**
 * Проверяет, находится ли адрес в вайтлисте
 * @param address - адрес в любом формате
 * @returns Объект с результатом проверки
 */


export function checkWhitelist(address: string, isTestnet: boolean) {
  // Публичный запуск 2026-08-03 — вайтлист-гейт (useAlphaAccess/ProtectedRoute)
  // снят по решению юзера, доступ открыт всем. whitelistMap/mainnetWhitelistMap
  // выше не мусор — те же адреса получили полный доступ ко всем длинам через
  // POST /api/admin/whitelist/migrate, это отдельная история от самого гейта.
  void isTestnet;
  return { isWhitelisted: true, telegramName: 'public', testnetAddress: address };
}





/**
 * Получает все адреса из вайтлиста
 */
export function getAllWhitelistAddresses(): Array<{
  address: string;
  telegramName: string;
}> {
  return Object.entries(whitelistMap).map(([address, telegramName]) => ({
    address,
    telegramName
  }));
}

/**
 * Проверяет, является ли адрес валидным тестнет адресом
 */
export function isValidTestnetAddress(address: string): boolean {
  return address.startsWith('0Q') || address.startsWith('kQ');
}
