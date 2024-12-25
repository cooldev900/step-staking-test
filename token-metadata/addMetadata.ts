import * as dotenv from 'dotenv';
import {
  createV1,
  findMetadataPda,
  mplTokenMetadata,
  TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata'
import {
  mplToolbox,
} from '@metaplex-foundation/mpl-toolbox'
import {
  percentAmount,
  createGenericFile,
  keypairIdentity,
  publicKey,
} from '@metaplex-foundation/umi'
import { base58 } from "@metaplex-foundation/umi/serializers";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys'
import path from 'path';
dotenv.config();

const mint = publicKey(process.env.MINT_ADDRESS || "5ehg7BoeVn1sjdKMV613GybX5mz2mYjJdKfZWrpz3CHb");

// Create the wrapper function
const addMetadata = async () => {
  const umi = createUmi('https://api.devnet.solana.com')
  .use(mplTokenMetadata())
  .use(mplToolbox())
  .use(irysUploader())

  let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(process.env.PRIVATE_KEY.split(",").map((value) => Number(value))));
  umi.use(keypairIdentity(keypair));

  const imageFile = path.join(__dirname, 'STEP_token_for_Solana_network.jpeg');

  const umiImageFile = createGenericFile(imageFile, 'image.jpeg', {
    tags: [{ name: 'contentType', value: 'image/jpeg' }],
  })

  const imageUri = await umi.uploader.upload([umiImageFile]).catch((err) => {
    throw new Error(err)
  })
  
  console.log(imageUri[0])

  // metadata
  const metadata = {
    name: 'Step Token',
    symbol: 'STP',
    description: 'The Step Token is a token created on the Solana blockchain',
    image: imageUri, // Either use variable or paste in string of the uri.
  }

  // Call upon Umi's `uploadJson` function to upload our metadata to Arweave via Irys.

  const metadataUri = await umi.uploader.uploadJson(metadata).catch((err) => {
    throw new Error(err)
  });

  await findMetadataPda(umi, {
		mint: mint,
	});

	const tx = await createV1(umi, {
		mint,
		authority: umi.identity,
		payer: umi.identity,
		updateAuthority: umi.identity,
		name: metadata.name,
		symbol: metadata.symbol,
		uri: metadataUri,
		sellerFeeBasisPoints: percentAmount(5.5), // 5.5%
		tokenStandard: TokenStandard.Fungible,
	}).sendAndConfirm(umi);

	let txSig = base58.deserialize(tx.signature);
	console.log(`https://explorer.solana.com/tx/${txSig}?cluster=devnet`);
}

// run the wrapper function
addMetadata()