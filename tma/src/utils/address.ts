export const shortenAddress = (address: string, start = 4, end = 4): string => {
  if (!address) return "NULL";
  return `${address.substring(0, start)}...${address.slice(-end)}`;
};
