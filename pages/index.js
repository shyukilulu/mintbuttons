import Head from 'next/head';
import dynamic from 'next/dynamic';

// 클라이언트 사이드에서만 렌더링되도록 설정
const NFTMintingButton = dynamic(
  () => import('../components/NFTMintingButton'),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <Head>
        <title>Fantasy NFT Minting</title>
        <meta name="description" content="Mint your own fantasy NFT" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className="container mx-auto">
        <NFTMintingButton />
      </main>
    </div>
  );
}