import {
    createFungible,
    mplTokenMetadata,
  } from '@metaplex-foundation/mpl-token-metadata'
  import {
    createTokenIfMissing,
    findAssociatedTokenPda,
    getSplAssociatedTokenProgramId,
    mintTokensTo,
  } from '@metaplex-foundation/mpl-toolbox'
  import {
    generateSigner,
    percentAmount,
    createGenericFile,
    signerIdentity,
    sol,
    keypairIdentity,
  } from '@metaplex-foundation/umi'
  import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
  import { irysUploader } from '@metaplex-foundation/umi-uploader-irys'
  import { base58 } from '@metaplex-foundation/umi/serializers'
  import path from 'path'
  import * as dotenv from 'dotenv';
  dotenv.config();
  
  const createAndMintTokens = async () => {
    const umi = createUmi('https://api.devnet.solana.com')
      .use(mplTokenMetadata())
      .use(irysUploader())
  
    let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(process.env.PRIVATE_KEY.split(",").map((value) => Number(value))));
    umi.use(keypairIdentity(keypair));
  
  // Airdrop 1 SOL to the identity
    // if you end up with a 429 too many requests error, you may have to use
    // the filesystem wallet method or change rpcs.
    // console.log("AirDrop 1 SOL to the umi identity");
    // await umi.rpc.airdrop(umi.identity.publicKey, sol(1));
  
    // use `fs` to read file via a string path.
    
    const imageFile = path.join(__dirname, 'xStep_token_solana.jpeg');
  
    // Use `createGenericFile` to transform the file into a `GenericFile` type
    // that umi can understand. Make sure you set the mimi tag type correctly
    // otherwise Arweave will not know how to display your image.
  
    const umiImageFile = createGenericFile(imageFile, "image.jpeg", {
      tags: [{ name: "Content-Type", value: "image/jpeg" }],
    });
  
    // Here we upload the image to Arweave via Irys and we get returned a uri
    // address where the file is located. You can log this out but as the
    // uploader can takes an array of files it also returns an array of uris.
    // To get the uri we want we can call index [0] in the array.
  
    console.log("Uploading image to Arweave via Irys");
    const imageUri = await umi.uploader.upload([umiImageFile]).catch((err) => {
      throw new Error(err);
    });
  
    console.log(imageUri[0]);
  
    // Uploading the tokens metadata to Arweave via Irys
  
    const metadata = {
      name: "xStep Token",
      symbol: "xSTP",
      description: "exchanged Step token",
      image: imageUri, // Either use variable or paste in string of the uri.
    };
  
    // Call upon umi's uploadJson function to upload our metadata to Arweave via Irys.
  
    console.log("Uploading metadata to Arweave via Irys");
    const metadataUri = await umi.uploader.uploadJson(metadata).catch((err) => {
      throw new Error(err);
    });
  
    // Creating the mintIx
  
    const mintSigner = generateSigner(umi);
  
    const createFungibleIx = createFungible(umi, {
      mint: mintSigner,
      name: "The xStep Token",
      uri: metadataUri, // we use the `metedataUri` variable we created earlier that is storing our uri.
      sellerFeeBasisPoints: percentAmount(0),
      decimals: 0, // set the amount of decimals you want your token to have.
    });
  
    // This instruction will create a new Token Account if required, if one is found then it skips.
  
    const createTokenIx = createTokenIfMissing(umi, {
      mint: mintSigner.publicKey,
      owner: umi.identity.publicKey,
      ataProgram: getSplAssociatedTokenProgramId(umi),
    });
  
    // The final instruction (if required) is to mint the tokens to the token account in the previous ix.
  
    const mintTokensIx = mintTokensTo(umi, {
      mint: mintSigner.publicKey,
      token: findAssociatedTokenPda(umi, {
        mint: mintSigner.publicKey,
        owner: umi.identity.publicKey,
      }),
      amount: BigInt(1000),
    });
  
    // The last step is to send the ix's off in a transaction to the chain.
    // Ix's here can be ommited and added as needed during the transaction chain.
    // If for example you just want to create the Token without minting
    // any tokens then you may only want to submit the `createToken` ix.
  
    console.log("Sending transaction")
    const tx = await createFungibleIx
      .add(createTokenIx)
      .add(mintTokensIx)
      .sendAndConfirm(umi);
  
    // finally we can deserialize the signature that we can check on chain.
    const signature = base58.deserialize(tx.signature)[0];
  
    // Log out the signature and the links to the transaction and the NFT.
    // Explorer links are for the devnet chain, you can change the clusters to mainnet.
    console.log('\nTransaction Complete')
    console.log('View Transaction on Solana Explorer')
    console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`)
    console.log('View Token on Solana Explorer')
    console.log(`https://explorer.solana.com/address/${mintSigner.publicKey}?cluster=devnet`)
  };
  
  createAndMintTokens()