import * as dotenv from 'dotenv';
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StepStakingTest } from "../target/types/step_staking_test";
import { createMint, TOKEN_PROGRAM_ID } from '@solana/spl-token';

dotenv.config();

describe("step-staking-test", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.StepStakingTest as Program<StepStakingTest>;

  it("Is initialized!", async () => {
    const keyData = process.env.PRIVATE_KEY.split(",").map((value) => Number(value));
    const mintKey = anchor.web3.Keypair.fromSecretKey(new Uint8Array(keyData));
    const mintPubkey = mintKey.publicKey;
    // tokenMint account for step token
    // const tokenMint = await createMint(
    //   provider.connection,
    //   mintKey,
    //   mintPubkey,
    //   null,
    //   9
    // );
    const tokenMint = new anchor.web3.PublicKey("5ehg7BoeVn1sjdKMV613GybX5mz2mYjJdKfZWrpz3CHb");

    const [tokenVault] = await anchor.web3.PublicKey.findProgramAddressSync([tokenMint.toBuffer()], program.programId);


    const tx = await program.methods.initialize().accounts({
      tokenMint,
      tokenVault,
      initializer: mintPubkey,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    }).rpc()
    console.log("Your transaction signature", tx);
  });
});
