import * as dotenv from "dotenv";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StepStakingTest } from "../target/types/step_staking_test";
import {
  TOKEN_PROGRAM_ID,
  mintTo,
  getAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
  setAuthority,
  AuthorityType,
  createMint,
  getMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { expect } from "chai";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { SPL_SYSTEM_PROGRAM_ID } from "@metaplex-foundation/mpl-toolbox";

dotenv.config();

describe("step-staking-test", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.StepStakingTest as Program<StepStakingTest>;

  let mintKey: Keypair;
  let tokenMintAuthority: Keypair;
  let tokenMint: PublicKey;
  let xTokenMint: PublicKey;
  let tokenVault: PublicKey;
  let nonce: number;

  beforeEach(async () => {
    mintKey = anchor.web3.Keypair.generate();
    tokenMintAuthority = anchor.web3.Keypair.generate();

    const connection = provider.connection;
    let airdropSignature = await connection.requestAirdrop(
      mintKey.publicKey,
      LAMPORTS_PER_SOL * 100,
    );
    await connection.confirmTransaction(airdropSignature);
    airdropSignature = await connection.requestAirdrop(
      tokenMintAuthority.publicKey,
      LAMPORTS_PER_SOL * 100,
    );
    await connection.confirmTransaction(airdropSignature);

    tokenMint = await createMint(
      provider.connection,
      mintKey,
      tokenMintAuthority.publicKey,
      mintKey.publicKey,
      9
    );

    // const tokenAccount = await getOrCreateAssociatedTokenAccount(
    //   provider.connection,
    //   mintKey,
    //   tokenMint,
    //   mintKey.publicKey
    // )

    // await mintTo(
    //   provider.connection,
    //   mintKey,
    //   tokenMint,
    //   tokenAccount.address,
    //   tokenMintAuthority,
    //   100000000000 // because decimals for the mint are set to 9 
    // )

    const [tokenVault, nonce] = await anchor.web3.PublicKey.findProgramAddressSync(
      [tokenMint.toBuffer()],
      program.programId
    );

    await program.methods.initialize().accounts({
      tokenMint,
      initializer: mintKey.publicKey,
      systemProgram: SPL_SYSTEM_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenVault,
    })
  });

  it("initialize", async () => {
    const mintInfo = await getMint(provider.connection, tokenMint);
    expect(mintInfo.mintAuthority.toBase58()).to.be.equal(tokenMintAuthority.publicKey.toBase58());
    expect(mintInfo.supply).to.be.equal(BigInt(0));
  })

  // it("reclaim mint authority", async () => {
    // const [tokenVault, nonce] = await anchor.web3.PublicKey.findProgramAddressSync(
    //   [tokenMint.toBuffer()],
    //   program.programId
    // );

    // await setAuthority(
    //   provider.connection,
    //   mintKey,
    //   tokenMint,
    //   mintKey,
    //   AuthorityType.MintTokens,
    //   tokenVault,
    // )

    // await program.methods.reclaimMintAuthority(nonce).accounts({
    //   tokenMint,
    //   xTokenMint,
    //   tokenVault,
    //   authority: mintKey.publicKey,
    //   tokenProgram: TOKEN_PROGRAM_ID
    // }).signers([mintKey]).rpc();
  // })

  // it("Withdraw nested ATA", async () => {
    // const refundee = anchor.web3.Keypair.generate();
  
    // // Find the PDA for the token vault
    // const [tokenVault] = await anchor.web3.PublicKey.findProgramAddressSync(
    //   [tokenMint.toBuffer()],
    //   program.programId
    // );
  
    // // Generate the nested ATA address
    // const tokenVaultNestedAta = await getAssociatedTokenAddress(
    //   tokenMint,
    //   tokenVault, // The "owner" is the primary vault
    //   true
    // );

    // // Create the nested ATA
    // await createAssociatedTokenAccount(
    //   provider.connection,
    //   mintKey,           // Wallet funding the creation
    //   tokenMint,
    //   tokenVault     // Nested ATA owner
    // );
  
    // Mint tokens to the manually created token account
    // await mintTo(
    //   provider.connection,
    //   mintKey,
    //   tokenMint,
    //   tokenVaultNestedAta,
    //   mintKey, // Mint authority
    //   1_000_000
    // );
  
    // await program.methods
    //   .withdrawNested()
    //   .accounts({
    //     refundee: refundee.publicKey,
    //     tokenMint,
    //     tokenVault,
    //     tokenVaultNestedAta,
    //     tokenProgram: TOKEN_PROGRAM_ID,
    //     associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
    //   })
    //   .signers([])
    //   .rpc();
  
    // // // Assert the token vault nested ATA is closed
    // try {
    //   await getAccount(provider.connection, tokenVaultNestedAta);
    //   throw new Error("Nested ATA should be closed but is still active.");
    // } catch (e) {
    //   expect(e.message).to.include("Failed to find account");
    // }
  
    // // Assert the token balance in the vault is updated
    // const vaultAccountInfo = await getAccount(provider.connection, tokenVault);
    // console.log({vaultAccountInfo})
    // expect(vaultAccountInfo.amount.toString()).to.equal("1000000");
  // });  
});
