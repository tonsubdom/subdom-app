// Функция для получения текущего ID из коллекции
export async function getCollectionId(collectionAddress: string, isTestnet: boolean = false): Promise<number> {
  try {
    const apiUrl = isTestnet
      ? "https://testnet.toncenter.com/api/v2/runGetMethod"
      : "https://toncenter.com/api/v2/runGetMethod";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({
        address: collectionAddress,
        method: "get_id",
        stack: []
      })
    });

    const data = await response.json();

    if (!data.ok || !data.result) {
      console.error("Failed to get collection ID:", data.error);
      return 0;
    }

    const stack = data.result.stack;
    if (stack.length > 0 && stack[0][0] === "num") {
      const idHex = stack[0][1]; // Формат: "0x309"
      const id = parseInt(idHex, 16);
      console.log("Collection ID (hex):", idHex, "-> (number):", id);
      return id;
    }

    return 0;
  } catch (error) {
    console.error("Error getting collection ID:", error);
    return 0;
  }
}