use anchor_lang::prelude::*;

declare_id!("7ZYww9sNB9iJKYCh3LefK2RiczAHddTLZ8dz9SGSfXzJ");

pub mod constants {
    pub const STEP_TOKEN_MINT_PUBKEY: &str = "5ehg7BoeVn1sjdKMV613GybX5mz2mYjJdKfZWrpz3CHb";
    pub const X_STEP_TOKEN_MINT_PUBKEY: &str = "GqRfdTLC2VnNaQqD3ckit2dox6TfDeMaHc4MM9F5mJAF";
}

#[program]
pub mod step_staking_test {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
