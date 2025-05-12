import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';

// Wallet adapter CSS 가져오기
import '@solana/wallet-adapter-react-ui/styles.css';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  // Solana 네트워크 선택 (mainnet-beta, testnet, devnet)
  const network = WalletAdapterNetwork.Devnet;
  
  // RPC 엔드포인트 설정
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // 지원할 지갑 어댑터 설정
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default MyApp;