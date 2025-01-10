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
} from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

dotenv.config();

describe("step-staking-test", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.StepStakingTest as Program<StepStakingTest>;

  let mintKey: Keypair;
  let tokenMint: PublicKey;

  beforeEach(async () => {
    const keyData = process.env.PRIVATE_KEY.split(",").map((value) => Number(value));
    if (keyData.length === 0) throw new Error("Invalid PRIVATE_KEY in .env");

    mintKey = anchor.web3.Keypair.fromSecretKey(new Uint8Array(keyData));
    tokenMint = new anchor.web3.PublicKey("2bgQCuwVFaFMDxmhtunFFgysEbZFJmLteHUkiiLC4Kzd");
  });

  it("Withdraw nested ATA", async () => {
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
  });  
});
