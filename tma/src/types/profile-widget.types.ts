// types/profile-widget.types.ts

export interface UserProfile {
  id: number;
  address: string;
  registrationDate: string;
  nftAccessAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Zone {
  id: number;
  name: string;
  address: string;
  collectionAddress?: string;
  wrapperAddress?: string;
  proxy: number;
  registrationDate: string;
  subdomainsAmount: number;
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subdomain {
  id: number;
  name: string;
  address: string;
  mintPrice: number;
  registrationDate: string;
  links: string;
  zoneId?: number;
  owner?: string;
  status: string;
  auctionEndTime?: string;
  lastBid?: number;
  lastBidder?: string;
  bids: string;
  createdAt: string;
  updatedAt: string;
}

export interface Auction {
  id: number;
  name: string;
  bid: string;
  ends: string;
  lastBidder?: string;
  status: 'active' | 'ended' | 'cancelled';
}

export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  text: string;
  border: string;
  secondaryBg: string;
  shadow: string;
  cyberpunk: string;
  gold: string;
  blue: string;
}

export interface ZoneTypeInfo {
  type: 'proxy' | 'sbt' | 'unknown';
  label: string;
  color: string;
  description: string;
}

export interface ZoneStatusInfo {
  status: string;
  color: string;
  description: string;
}

export interface SubdomainStatusInfo {
  status: string;
  color: string;
  description: string;
}

export interface ButtonHandlers {
  handleCreateSubdomain: (zoneId: number, e: React.MouseEvent) => void;
  handleManageDomain: (zoneId: number, e: React.MouseEvent) => void;
  handleManageSubdomain: (subdomainId: number, e: React.MouseEvent) => void;
  handleSellSubdomain: (subdomainId: number, e: React.MouseEvent) => void;
  handleGoToAuction: (auctionId: number, e: React.MouseEvent) => void;
}

export interface CardButtonProps {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export interface TabConfig {
  id: 'zones' | 'subdomains' | 'auctions' | 'info';
  label: string;
  icon: string;
}