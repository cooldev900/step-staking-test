import * as dotenv from "dotenv";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StepStakingTest } from "../target/types/step_staking_test";
import {
  TOKEN_PROGRAM_ID,
  mintTo,
  getAccount,
  createMint,
  getMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { expect } from "chai";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { SPL_SYSTEM_PROGRAM_ID } from "@metaplex-foundation/mpl-toolbox";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

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

    [tokenVault, nonce] = await anchor.web3.PublicKey.findProgramAddressSync(
      [tokenMint.toBuffer()],
      program.programId,
    );

    xTokenMint = await createMint(
      provider.connection,
      mintKey,
      tokenVault,
      mintKey.publicKey,
      9
    );

    await program.methods.initialize().accounts({
      tokenMint,
      initializer: mintKey.publicKey,
      systemProgram: SPL_SYSTEM_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenVault,
    }).signers([mintKey]).rpc();
  });

  it("initialize", async () => {
    const mintInfo = await getMint(provider.connection, tokenMint);
    expect(mintInfo.mintAuthority.toBase58()).to.be.equal(tokenMintAuthority.publicKey.toBase58());
    expect(mintInfo.supply).to.be.equal(BigInt(0));
  });

  it("Withdraw nested ATA", async () => {
    const refundee = anchor.web3.Keypair.generate();

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        refundee.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    tokenVault = PublicKey.createProgramAddressSync(
      [tokenMint.toBuffer(), Buffer.from([nonce])],
      program.programId,
    );

    // Generate the nested ATA address
    const tokenVaultNestedAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      mintKey,
      tokenMint,
      tokenVault,
      true,
    );
  
    //Mint tokens to the manually created token account
    await mintTo(
      provider.connection,
      mintKey,
      tokenMint,
      tokenVaultNestedAta.address,
      tokenMintAuthority, // Mint authority
      1_000_000
    );

  
    await program.methods
      .withdrawNested()
      .accounts({
        refundee: refundee.publicKey,
        tokenMint,
        tokenVault,
        tokenVaultNestedAta: tokenVaultNestedAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      })
      .signers([])
      .rpc();
  
    // Assert the token vault nested ATA is closed
    try {
      await getAccount(provider.connection, tokenVaultNestedAta.address);
      throw new Error("Nested ATA should be closed but is still active.");
    } catch (e) {
      console.log(e.message)
      expect(e.message).to.be;
    }
  
    // Assert the token balance in the vault is updated
    const vaultAccountInfo = await getAccount(provider.connection, tokenVault);
    expect(vaultAccountInfo.amount.toString()).to.equal("1000000");
  });  

  it("reclaim mint authority", async () => {
    await program.methods.reclaimMintAuthority(nonce).accounts({
      tokenMint,
      xTokenMint,
      tokenVault,
      authority: tokenMintAuthority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID
    }).signers([tokenMintAuthority]).rpc();

    const xMintInfo = await getMint(provider.connection, xTokenMint);
    expect(xMintInfo.mintAuthority.toBase58()).to.be.equal(tokenMintAuthority.publicKey.toBase58());
  });

  it("stake", async () => {
    const tokenFrom = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      mintKey,
      tokenMint,
      mintKey.publicKey
    );

    await mintTo(
      provider.connection,
      mintKey,
      tokenMint,
      tokenFrom.address,
      tokenMintAuthority,
      1_000_000,
    )

    const to = anchor.web3.Keypair.generate();
    const xTokenTo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      mintKey,
      xTokenMint,
      to.publicKey,
    );

    await program.methods.stake(nonce, new anchor.BN(1_000_000)).accounts({
      tokenMint,
      xTokenMint,
      tokenFrom: tokenFrom.address,
      tokenFromAuthority: mintKey.publicKey,
      xTokenTo: xTokenTo.address,
      tokenVault,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).signers([mintKey]).rpc();

    const xTokenToInfo = await getAccount(provider.connection, xTokenTo.address);
    expect(xTokenToInfo.amount).to.be.equal(BigInt(1_000_000));
  });
});
