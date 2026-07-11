

//с сбт

// src/store/nft/blockchainReducer
import { createSlice } from '@reduxjs/toolkit';
import { 
  deployProxy, 
  deployBundle, 
  getAuctionInfo, 
  parseAuctionInfo, 
  claimSubdomain,
  deploySBTCollection // Добавляем новый экшен
} from './actions';

interface BlockchainState {
  proxyDeployment: {
    address?: string;
    loading: boolean;
    error: string | null;
  };
  bundleDeployment: {
    address?: string;
    loading: boolean;
    error: string | null;
  };
  sbtCollectionDeployment: {
    address?: string;
    loading: boolean;
    error: string | null;
  };
  auctionInfo: {
    data: {
      maxBidAddress?: string;
      maxBidAmount?: number;
      auctionEndTime?: number;
    };
    loading: boolean;
    error: string | null;
  };
  subdomainClaim: {
    success: boolean;
    loading: boolean;
    error: string | null;
  };
}

const initialState: BlockchainState = {
  proxyDeployment: {
    loading: false,
    error: null
  },
  bundleDeployment: {
    loading: false,
    error: null
  },
  sbtCollectionDeployment: {
    loading: false,
    error: null
  },
  auctionInfo: {
    data: {},
    loading: false,
    error: null
  },
  subdomainClaim: {
    success: false,
    loading: false,
    error: null
  }
};

const blockchainSlice = createSlice({
  name: 'blockchain',
  initialState,
  reducers: {
    resetProxyDeployment: (state) => {
      state.proxyDeployment = initialState.proxyDeployment;
    },
    resetBundleDeployment: (state) => {
      state.bundleDeployment = initialState.bundleDeployment;
    },
    resetSBTCollectionDeployment: (state) => {
      state.sbtCollectionDeployment = initialState.sbtCollectionDeployment;
    },
    resetAllDeployments: (state) => {
      state.proxyDeployment = initialState.proxyDeployment;
      state.bundleDeployment = initialState.bundleDeployment;
      state.sbtCollectionDeployment = initialState.sbtCollectionDeployment;
    }
  },
  extraReducers: (builder) => {
    // Proxy Deployment
    builder
      .addCase(deployProxy.pending, (state) => {
        state.proxyDeployment.loading = true;
        state.proxyDeployment.error = null;
      })
      .addCase(deployProxy.fulfilled, (state, action) => {
        state.proxyDeployment.loading = false;
        state.proxyDeployment.address = action.payload.messages[0].address;
      })
      .addCase(deployProxy.rejected, (state, action) => {
        state.proxyDeployment.loading = false;
        state.proxyDeployment.error = action.payload as string;
      })
      
    // Bundle Deployment  
    builder
      .addCase(deployBundle.pending, (state) => {
        state.bundleDeployment.loading = true;
        state.bundleDeployment.error = null;
      })
      .addCase(deployBundle.fulfilled, (state, action) => {
        state.bundleDeployment.loading = false;
        state.bundleDeployment.address = action.payload.messages[0].address;
      })
      .addCase(deployBundle.rejected, (state, action) => {
        state.bundleDeployment.loading = false;
        state.bundleDeployment.error = action.payload as string;
      })
      
    // SBT Collection Deployment  
    builder
      .addCase(deploySBTCollection.pending, (state) => {
        state.sbtCollectionDeployment.loading = true;
        state.sbtCollectionDeployment.error = null;
      })
      .addCase(deploySBTCollection.fulfilled, (state, action) => {
        state.sbtCollectionDeployment.loading = false;
        state.sbtCollectionDeployment.address = action.payload.messages[0].address;
      })
      .addCase(deploySBTCollection.rejected, (state, action) => {
        state.sbtCollectionDeployment.loading = false;
        state.sbtCollectionDeployment.error = action.payload as string;
      })
      
    // Auction Info  
    builder
      .addCase(getAuctionInfo.pending, (state) => {
        state.auctionInfo.loading = true;
        state.auctionInfo.error = null;
      })
      .addCase(parseAuctionInfo.fulfilled, (state, action) => {
        state.auctionInfo.loading = false;
        state.auctionInfo.data = {
          maxBidAddress: action.payload.max_bid_address,
          maxBidAmount: action.payload.max_bid_amount,
          auctionEndTime: action.payload.auction_end_time
        };
      })
      .addCase(parseAuctionInfo.rejected, (state, action) => {
        state.auctionInfo.loading = false;
        state.auctionInfo.error = action.payload as string;
      })
      
    // Subdomain Claim  
    builder
      .addCase(claimSubdomain.pending, (state) => {
        state.subdomainClaim.loading = true;
        state.subdomainClaim.error = null;
        state.subdomainClaim.success = false;
      })
      .addCase(claimSubdomain.fulfilled, (state) => {
        state.subdomainClaim.loading = false;
        state.subdomainClaim.success = true;
      })
      .addCase(claimSubdomain.rejected, (state, action) => {
        state.subdomainClaim.loading = false;
        state.subdomainClaim.error = action.payload as string;
        state.subdomainClaim.success = false;
      });
  }
});

export const { 
  resetProxyDeployment, 
  resetBundleDeployment,
  resetSBTCollectionDeployment,
  resetAllDeployments 
} = blockchainSlice.actions;

export const blockchainReducer = blockchainSlice.reducer;