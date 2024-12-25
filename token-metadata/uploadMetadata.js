const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { Metaplex, keypairIdentity } = require('@metaplex-foundation/js');
require('dotenv').config();

async function main() {
  const connection = new Connection('https://api.devnet.solana.com'); // Use 'https://api.mainnet-beta.solana.com' for Mainnet
  const wallet = Keypair.fromSecretKey(Uint8Array.from(process.env.PRIVATE_KEY.split(",")));

  const metaplex = Metaplex.make(connection).use(keypairIdentity(wallet));

  const mintAddress = new PublicKey(process.env.MINT_ADDRESS || "5ehg7BoeVn1sjdKMV613GybX5mz2mYjJdKfZWrpz3CHb"); // Replace with your token mint address
  const metadata = {
    name: 'Step Token', // Name of your token
    symbol: 'STP',         // Symbol of your token
    uri: 'https://github.com/cooldev900/step-staking-test/blob/main/toke-metadata/metadata.json', // Link to your hosted metadata JSON
    sellerFeeBasisPoints: 0 // Set royalties to 0 for fungible tokens
  };

  try {
    const { nft } = await metaplex.tokens().create({
      mintAddress,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
    });

    console.log('Metadata added successfully:', nft);
  } catch (error) {
    console.error('Failed to attach metadata:', error);
  }
}

main();
