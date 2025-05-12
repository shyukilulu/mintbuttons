import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  mplCandyMachine,
  fetchCandyMachine,
  mintV2,
  safeFetchCandyGuard
} from '@metaplex-foundation/mpl-candy-machine';
import { publicKey } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';

const NFTMintingButton = () => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [nftsLeft, setNftsLeft] = useState(0);
  const [mintPrice, setMintPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [mintedNFT, setMintedNFT] = useState(null);
  const [candyMachine, setCandyMachine] = useState(null);

  // 실제 배포 전에 Candy Machine ID 변경 필요
  const candyMachineId = process.env.NEXT_PUBLIC_CANDY_MACHINE_ID || "9BokyUPDNHgsbbNy2gviC5r6aCg6oYoGN3auuuc3J8K9";

  useEffect(() => {
    if (wallet?.publicKey && connection) {
      fetchCandyMachineInfo();
    }
  }, [wallet?.publicKey, connection]);

  // WalletMultiButton 스타일을 수정하기 위한 useEffect
  useEffect(() => {
    // Select Wallet 버튼의 스타일을 직접 수정
    const styleWalletButton = () => {
      // 모든 wallet-adapter-button 클래스를 가진 요소를 찾아서 스타일 적용
      const walletButtons = document.querySelectorAll('.wallet-adapter-button');
      walletButtons.forEach(button => {
        button.style.background = 'linear-gradient(90deg, #ff9800 0%, #ff5722 100%)';
        button.style.border = 'none';
        button.style.color = 'white';
      });

      // 드롭다운 메뉴 항목도 스타일 적용
      const walletDropdownItems = document.querySelectorAll('.wallet-adapter-dropdown-list-item');
      walletDropdownItems.forEach(item => {
        item.style.background = '#2a2417';
        item.style.color = 'white';
        item.style.borderColor = 'rgba(255, 215, 0, 0.2)';
        item.addEventListener('mouseenter', () => {
          item.style.background = '#ff9800';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = '#2a2417';
        });
      });
    };

    // DOM이 업데이트된 후 스타일 적용
    setTimeout(styleWalletButton, 100);
    // 지갑 상태가 변경될 때마다 스타일 다시 적용
    window.addEventListener('resize', styleWalletButton);

    return () => {
      window.removeEventListener('resize', styleWalletButton);
    };
  }, [wallet.connected]);

  const fetchCandyMachineInfo = async () => {
    try {
      // Umi 인스턴스 생성 (mainnet 사용)
      const umi = createUmi('https://api.mainnet-beta.solana.com');
      
      // 중요: 먼저 mplCandyMachine 플러그인 등록
      umi.use(mplCandyMachine());

      // 지갑 어댑터 등록 - 올바른 방식으로 사용
      if (wallet.publicKey) {
        umi.use(walletAdapterIdentity(wallet));
      }
      
      // Candy Machine ID를 publicKey로 변환
      const cmId = publicKey(candyMachineId);
      
      console.log("Fetching Candy Machine with ID:", candyMachineId);
      // Candy Machine 정보 가져오기
      const cm = await fetchCandyMachine(umi, cmId);
      setCandyMachine(cm);
      
      // Candy Guard 정보 가져오기 (있는 경우)
      if (cm.mintAuthority) {
        const guard = await safeFetchCandyGuard(umi, cm.mintAuthority);
        
        // 가격 정보 설정 (SOL 단위로 변환)
        if (guard && guard.guards.solPayment) {
          const lamports = Number(guard.guards.solPayment.value.lamports);
          setMintPrice(lamports / 1000000000); // Lamports to SOL
        }
      }
      
      // 남은 NFT 수량 계산
      const itemsAvailable = Number(cm.itemsAvailable);
      const itemsMinted = Number(cm.itemsMinted);
      setNftsLeft(itemsAvailable - itemsMinted);
      
    } catch (error) {
      console.error("Error fetching Candy Machine info:", error);
    }
  };

  const handleMint = async () => {
    if (!wallet.connected || !candyMachine) {
      return;
    }

    setIsLoading(true);

    try {
      // Umi 인스턴스 생성 (mainnet 사용)
      const umi = createUmi('https://api.mainnet-beta.solana.com');
      
      // 먼저 mplCandyMachine 플러그인 등록
      umi.use(mplCandyMachine());
      
      // 지갑 어댑터 등록 - 올바른 방식으로 사용
      umi.use(walletAdapterIdentity(wallet));
      
      // Candy Machine ID를 publicKey로 변환
      const cmId = publicKey(candyMachineId);
      
      // 민팅 실행
      const { signature, nft } = await mintV2(umi, {
        candyMachine: cmId,
        collectionUpdateAuthority: candyMachine.authority,
      }).sendAndConfirm(umi);
      
      // 민트된 NFT 정보 설정
      const mintAddress = base58.serialize(nft);
      
      setMintedNFT({
        mintAddress: mintAddress,
      });
      
      // 남은 NFT 수량 갱신
      setNftsLeft(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error("Minting failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mint-container">
      <div className="info-card">
        <div className="info-content">
          <div className="info-row">
            <span className="font-medieval">Remaining NFTs</span>
            <span className="value font-medieval">{nftsLeft}</span>
          </div>
          <div className="info-row">
            <span className="font-medieval">Mint Price</span>
            <span className="value font-medieval">{mintPrice} SOL</span>
          </div>
        </div>

        <div className="mint-action">
          {!wallet.connected ? (
            <div className="wallet-button-wrapper">
              <WalletMultiButton className="wallet-button custom-wallet-btn font-medieval" />
            </div>
          ) : (
            <button
              onClick={handleMint}
              disabled={isLoading || nftsLeft === 0}
              className={`mint-button font-medieval ${isLoading || nftsLeft === 0 ? "disabled" : ""}`}
            >
              {isLoading ? (
                <span className="loading-indicator">
                  <svg className="spinner" viewBox="0 0 50 50">
                    <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                  </svg>
                  <span>Minting...</span>
                </span>
              ) : nftsLeft === 0 ? (
                "Sold Out"
              ) : (
                "Mint Now"
              )}
            </button>
          )}
        </div>
      </div>
      
      {mintedNFT && (
        <div className="success-card">
          <div className="success-content">
            <div className="success-icon">✓</div>
            <h3 className="font-medieval">NFT Minted Successfully!</h3>
            <a 
              href={`https://solscan.io/token/${mintedNFT.mintAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="view-button font-medieval"
            >
              View on Solscan
            </a>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .mint-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 480px;
          margin: 0 auto;
          gap: 24px;
        }
        
        .info-card {
          width: 100%;
          background: linear-gradient(135deg, #2a2417 0%, #1c1810 100%);
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          position: relative;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 215, 0, 0.2);
        }
        
        .info-content {
          padding: 24px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 215, 0, 0.2);
          color: #e0e0e0;
          font-size: 18px;
        }
        
        .info-row:last-child {
          margin-bottom: 0;
          border-bottom: none;
        }
        
        .value {
          font-weight: bold;
          color: #ffc107;
        }
        
        .mint-action {
          padding: 24px;
          background: rgba(0, 0, 0, 0.2);
        }
        
        .wallet-button-wrapper {
          width: 100%;
        }
        
        .mint-button {
          background: linear-gradient(90deg, #ff9800 0%, #ff5722 100%);
          border: none;
          color: white;
          width: 100%;
          height: 56px;
          font-size: 18px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .mint-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 7px 14px rgba(255, 152, 0, 0.3);
        }
        
        .mint-button:before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0) 100%);
          transition: all 0.5s ease;
        }
        
        .mint-button:hover:before {
          left: 100%;
        }
        
        .mint-button.disabled {
          background: #4d4d4d;
          cursor: not-allowed;
          transform: none;
        }
        
        .mint-button.disabled:hover:before {
          left: -100%;
        }
        
        .loading-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .spinner {
          animation: rotate 2s linear infinite;
          width: 24px;
          height: 24px;
        }
        
        .path {
          stroke: #ffffff;
          stroke-linecap: round;
          animation: dash 1.5s ease-in-out infinite;
        }
        
        @keyframes rotate {
          100% { transform: rotate(360deg); }
        }
        
        @keyframes dash {
          0% {
            stroke-dasharray: 1, 150;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -35;
          }
          100% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -124;
          }
        }
        
        .success-card {
          width: 100%;
          background: linear-gradient(135deg, #8a3a1e 0%, #81542e 100%);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 215, 0, 0.2);
          animation: slideIn 0.5s ease-out;
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .success-content {
          padding: 32px;
          text-align: center;
          color: white;
        }
        
        .success-icon {
          width: 64px;
          height: 64px;
          background: #ff9800;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 0 auto 16px;
        }
        
        .success-content h3 {
          font-size: 22px;
          margin: 0 0 24px;
        }
        
        .view-button {
          display: inline-block;
          background: rgba(255, 152, 0, 0.2);
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        
        .view-button:hover {
          background: rgba(255, 152, 0, 0.3);
        }
      `}</style>
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap');
        
        .font-medieval {
          font-family: 'MedievalSharp', cursive;
        }
        
        body {
          background: linear-gradient(135deg, #121212 0%, #1e1e1e 100%);
          color: white;
          min-height: 100vh;
        }

        /* 지갑 버튼 스타일 오버라이드 */
        .wallet-adapter-button {
          background: linear-gradient(90deg, #ff9800 0%, #ff5722 100%) !important;
          border: none !important;
          color: white !important;
          width: 100% !important;
          height: 56px !important;
          font-size: 18px !important;
          border-radius: 8px !important;
          transition: all 0.3s ease !important;
          text-transform: none !important;
          font-weight: normal !important;
        }
        
        .wallet-adapter-button:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 7px 14px rgba(255, 152, 0, 0.3) !important;
        }
        
        .wallet-adapter-button:not([disabled]):hover {
          background: linear-gradient(90deg, #ff9800 0%, #ff5722 100%) !important;
          opacity: 0.9;
        }
        
        /* 드롭다운 메뉴 스타일 */
        .wallet-adapter-dropdown-list {
          background: #2a2417 !important;
          border: 1px solid rgba(255, 215, 0, 0.2) !important;
        }
        
        .wallet-adapter-dropdown-list-item {
          color: white !important;
          background: #2a2417 !important;
          border-color: rgba(255, 215, 0, 0.2) !important;
          transition: all 0.2s ease !important;
        }
        
        .wallet-adapter-dropdown-list-item:hover {
          background: #ff9800 !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
};

export default NFTMintingButton;