'use client';

import React from 'react';
import { useAccount, useBalance, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { formatEther, parseEther, type Hex } from 'viem';
import { useRouter } from 'next/navigation';
import { useGameStore } from '../../store/gameStore';
import { EXCHANGE_ITEMS, type ExchangeItemKey } from '../../lib/sepoliaExchange';
import {
  completeSepoliaListingSale,
  createSepoliaListing,
  createSepoliaListingDraft,
  loadSepoliaListings,
  releaseSepoliaListing,
  reserveSepoliaListing,
  type SepoliaListing,
} from '../../game/sepoliaMarket';
import './sepolia-exchange.css';

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function SepoliaExchangePage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { sendTransactionAsync, isPending: isSendingTransaction } = useSendTransaction();
  const router = useRouter();
  const { inventory, hydrateFromSupabase, addResource, isHydrated, isHydrating } = useGameStore();
  const { data: balance } = useBalance({ address });

  const [selectedItem, setSelectedItem] = React.useState<ExchangeItemKey>('wheat');
  const [quantity, setQuantity] = React.useState(1);
  const [unitPriceEth, setUnitPriceEth] = React.useState(EXCHANGE_ITEMS[0].suggestedUnitPriceEth);
  const [listings, setListings] = React.useState<SepoliaListing[]>([]);
  const [loadingListings, setLoadingListings] = React.useState(true);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [activeListingId, setActiveListingId] = React.useState<string | null>(null);
  const [activeTxHash, setActiveTxHash] = React.useState<Hex | undefined>();
  const [saleIntent, setSaleIntent] = React.useState<{ listingId: string; buyerAddress: string } | null>(null);

  React.useEffect(() => {
    if (!address) {
      router.replace('/');
    }
  }, [address, router]);

  React.useEffect(() => {
    if (address) {
      void hydrateFromSupabase();
    }
  }, [address, hydrateFromSupabase]);

  React.useEffect(() => {
    const item = EXCHANGE_ITEMS.find((entry) => entry.key === selectedItem);
    if (!item) return;

    if (!unitPriceEth || unitPriceEth === '0') {
      setUnitPriceEth(item.suggestedUnitPriceEth);
    }
  }, [selectedItem, unitPriceEth]);

  const loadListings = React.useCallback(async () => {
    setLoadingListings(true);
    const nextListings = await loadSepoliaListings();
    setListings(nextListings);
    setLoadingListings(false);
  }, []);

  React.useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const receipt = useWaitForTransactionReceipt({
    hash: activeTxHash,
    query: { enabled: Boolean(activeTxHash) },
  });

  React.useEffect(() => {
    if (!receipt.isSuccess || !saleIntent || !activeTxHash || !address) return;

    const finalizeSale = async () => {
      await completeSepoliaListingSale({
        id: saleIntent.listingId,
        buyerAddress: saleIntent.buyerAddress,
        txHash: activeTxHash,
      });
      setStatusMessage('Purchase confirmed on Sepolia.');
      setSaleIntent(null);
      setActiveTxHash(undefined);
      setActiveListingId(null);
      await loadListings();
    };

    void finalizeSale();
  }, [address, activeTxHash, loadListings, receipt.isSuccess, saleIntent]);

  React.useEffect(() => {
    if (receipt.isError && saleIntent) {
      void releaseSepoliaListing(saleIntent.listingId, saleIntent.buyerAddress);
      setErrorMessage('The payment transaction failed or was rejected.');
      setSaleIntent(null);
      setActiveTxHash(undefined);
      setActiveListingId(null);
      void loadListings();
    }
  }, [loadListings, receipt.isError, saleIntent]);

  const activeItem = EXCHANGE_ITEMS.find((item) => item.key === selectedItem) ?? EXCHANGE_ITEMS[0];
  const availableQty = inventory[selectedItem];
  const maxQuantity = Math.max(1, availableQty);
  const canList = Boolean(address && quantity > 0 && quantity <= availableQty && unitPriceEth.trim().length > 0);

  const listingPreviewEth = React.useMemo(() => {
    try {
      return formatEther(parseEther(unitPriceEth) * BigInt(quantity));
    } catch {
      return '0';
    }
  }, [quantity, unitPriceEth]);

  const onCreateListing = async () => {
    if (!address) return;
    if (!canList) {
      setErrorMessage('Choose a valid amount and price before listing.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const parsedPrice = unitPriceEth.trim();
      const draft = createSepoliaListingDraft({
        sellerAddress: address,
        itemKey: selectedItem,
        amount: quantity,
        unitPriceWei: parseEther(parsedPrice).toString(),
      });

      const created = await createSepoliaListing({
        sellerAddress: draft.seller_address,
        itemKey: draft.item_key,
        quantity: draft.amount,
        unitPriceEth: parsedPrice,
      });

      if (!created) {
        setErrorMessage('Unable to publish listing to Sepolia market.');
        return;
      }

      addResource(selectedItem, -quantity);
      setStatusMessage('Listing published. Buyers can now pay your wallet on Sepolia.');
      setQuantity(1);
      setUnitPriceEth(activeItem.suggestedUnitPriceEth);
      await loadListings();
    } catch {
      setErrorMessage('Enter a valid ETH price such as 0.00001.');
    }
  };

  const onBuyListing = async (listing: SepoliaListing) => {
    if (!address) return;
    if (listing.sellerAddress.toLowerCase() === address.toLowerCase()) {
      setErrorMessage('You cannot buy your own listing.');
      return;
    }

    if (chainId !== sepolia.id) {
      setErrorMessage('Switch to Sepolia to buy items.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    const reserved = await reserveSepoliaListing(listing.id, address);
    if (!reserved) {
      setErrorMessage('That listing was just bought by someone else.');
      await loadListings();
      return;
    }

    setActiveListingId(listing.id);

    try {
      const txHash = await sendTransactionAsync({
        to: listing.sellerAddress as `0x${string}`,
        value: parseEther(listing.totalPriceEth),
      });
      setActiveTxHash(txHash);
      setSaleIntent({ listingId: listing.id, buyerAddress: address });
      setStatusMessage('Transaction submitted. Waiting for Sepolia confirmation...');
    } catch (error) {
      await releaseSepoliaListing(listing.id, address);
      setActiveListingId(null);
      setStatusMessage(null);
      setErrorMessage(error instanceof Error ? error.message : 'Sepolia payment failed.');
      await loadListings();
    }
  };

  const handleSwitchToSepolia = async () => {
    try {
      await switchChainAsync({ chainId: sepolia.id });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to switch to Sepolia.');
    }
  };

  const currentBalance = balance?.formatted ?? '0';
  const isSepolia = chainId === sepolia.id;
  const storageLoading = isHydrating && !isHydrated;

  return (
    <div className="sepolia-exchange-page">
      <header className="exchange-hero">
        <div>
          <p className="exchange-kicker">Sepolia Settlement</p>
          <h1 className="exchange-title">Public Produce Exchange</h1>
          <p className="exchange-subtitle">
            List farm and mine output for direct Sepolia payment. Buyers pay your wallet on-chain and the listing updates in Supabase.
          </p>
        </div>

        <div className="exchange-wallet-card">
          <span className="exchange-wallet-label">Wallet</span>
          <span className="exchange-wallet-value">{isConnected && address ? shortAddress(address) : 'Not connected'}</span>
          <span className="exchange-wallet-meta">Sepolia balance {currentBalance} ETH</span>
          {!isSepolia ? (
            <button className="exchange-btn exchange-btn-accent" onClick={handleSwitchToSepolia} disabled={isSwitchingChain}>
              Switch to Sepolia
            </button>
          ) : (
            <span className="exchange-chain-pill">Sepolia active</span>
          )}
        </div>
      </header>

      {(statusMessage || errorMessage) && (
        <div className={`exchange-banner ${errorMessage ? 'error' : 'success'}`}>
          {errorMessage ?? statusMessage}
        </div>
      )}

      <div className="exchange-grid">
        <section className="exchange-card exchange-form-card">
          <div className="exchange-card-head">
            <div>
              <h2>List Produce</h2>
              <p>Pull stock from your game inventory and publish it for Sepolia buyers.</p>
            </div>
            <span className="exchange-card-badge">Seller</span>
          </div>

          {storageLoading ? (
            <p className="exchange-loading">Syncing inventory...</p>
          ) : (
            <>
              <div className="exchange-form-grid">
                <label className="exchange-field">
                  <span>Item</span>
                  <select value={selectedItem} onChange={(event) => setSelectedItem(event.target.value as ExchangeItemKey)}>
                    {EXCHANGE_ITEMS.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label} ({inventory[item.key]})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="exchange-field">
                  <span>Quantity</span>
                  <input
                    type="number"
                    min={1}
                    max={maxQuantity}
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                  />
                </label>

                <label className="exchange-field exchange-field-wide">
                  <span>Unit price in ETH</span>
                  <input
                    type="text"
                    value={unitPriceEth}
                    onChange={(event) => setUnitPriceEth(event.target.value)}
                    placeholder={activeItem.suggestedUnitPriceEth}
                  />
                </label>
              </div>

              <div className="exchange-preview">
                <div>
                  <span className="metric-label">Available</span>
                  <span className="metric-value">{availableQty.toLocaleString()}</span>
                </div>
                <div>
                  <span className="metric-label">Listing total</span>
                  <span className="metric-value">{listingPreviewEth} ETH</span>
                </div>
                <div>
                  <span className="metric-label">On-chain settlement</span>
                  <span className="metric-value">Sepolia</span>
                </div>
              </div>

              <div className="exchange-actions">
                <button className="exchange-btn exchange-btn-accent" onClick={onCreateListing} disabled={!canList || isSendingTransaction || !isSepolia}>
                  Publish Listing
                </button>
                {!isSepolia && <span className="exchange-help">Switch to Sepolia to publish or buy listings.</span>}
              </div>
            </>
          )}
        </section>

        <section className="exchange-card exchange-listings-card">
          <div className="exchange-card-head">
            <div>
              <h2>Live Listings</h2>
              <p>Buyers can pay directly to the seller wallet on Sepolia.</p>
            </div>
            <button className="exchange-btn" onClick={() => void loadListings()} disabled={loadingListings}>
              Refresh
            </button>
          </div>

          {loadingListings ? (
            <p className="exchange-loading">Loading public listings...</p>
          ) : listings.length === 0 ? (
            <p className="exchange-empty">No active listings yet. Be the first to publish produce.</p>
          ) : (
            <ul className="exchange-list">
              {listings.map((listing) => {
                const item = EXCHANGE_ITEMS.find((entry) => entry.key === listing.itemKey);
                const isOwnListing = address ? listing.sellerAddress.toLowerCase() === address.toLowerCase() : false;

                return (
                  <li key={listing.id} className={`exchange-listing ${item?.toneClass ?? ''}`}>
                    <div className="exchange-listing-main">
                      <div className="exchange-listing-title">
                        <span className="exchange-listing-name">{item?.label ?? listing.itemKey}</span>
                        <span className="exchange-listing-count">x{listing.quantity}</span>
                      </div>
                      <p className="exchange-listing-desc">{item?.description ?? 'Public produce order'}</p>
                      <div className="exchange-listing-meta">
                        <span>Seller: {shortAddress(listing.sellerAddress)}</span>
                        <span>Unit: {listing.unitPriceEth} ETH</span>
                        <span>Total: {listing.totalPriceEth} ETH</span>
                      </div>
                    </div>

                    <div className="exchange-listing-actions">
                      <button
                        className="exchange-btn exchange-btn-buy"
                        onClick={() => void onBuyListing(listing)}
                        disabled={isOwnListing || activeListingId === listing.id || !isConnected || !isSepolia || isSendingTransaction}
                      >
                        {activeListingId === listing.id ? 'Buying...' : 'Buy on Sepolia'}
                      </button>
                      {isOwnListing && <span className="exchange-help">Your listing</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}