use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

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
pub struct Initialize<'info> {
    #[account(
        address = constants::STEP_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
    )]
    pub token_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub initializer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,

    #[account(
        init,
        payer = initializer,
        token::mint = token_mint,
        token::authority = token_vault,
        seeds = [constants::STEP_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap().as_ref()],
        bump,
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,
}
