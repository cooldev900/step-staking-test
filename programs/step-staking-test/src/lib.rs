use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount}};

declare_id!("7ZYww9sNB9iJKYCh3LefK2RiczAHddTLZ8dz9SGSfXzJ");

// #[cfg(not(feature = "local-testing"))]
// pub mod constants {
//     pub const STEP_TOKEN_MINT_PUBKEY: &str = "5ehg7BoeVn1sjdKMV613GybX5mz2mYjJdKfZWrpz3CHb";
//     pub const X_STEP_TOKEN_MINT_PUBKEY: &str = "GqRfdTLC2VnNaQqD3ckit2dox6TfDeMaHc4MM9F5mJAF";
// }

// #[cfg(feature = "local-testing")]
pub mod constants {
    pub const STEP_TOKEN_MINT_PUBKEY: &str = "2bgQCuwVFaFMDxmhtunFFgysEbZFJmLteHUkiiLC4Kzd";
    pub const X_STEP_TOKEN_MINT_PUBKEY: &str = "GqRfdTLC2VnNaQqD3ckit2dox6TfDeMaHc4MM9F5mJAF";
}

#[program]
pub mod step_staking_test {
    use anchor_spl::token;

    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn withdraw_nested(ctx: Context<WithdrawNested>) -> Result<()> {
        let token_mint_key = ctx.accounts.token_mint.key();
        let seeds = &[token_mint_key.as_ref(), &[ctx.bumps["token_vault"]]];
        let signer = &[&seeds[..]];

        //transfer from vault ata to vault
        let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), token::Transfer {
            from: ctx.accounts.token_vault_nested_ata.to_account_info(),
            to: ctx.accounts.token_vault.to_account_info(),
            authority: ctx.accounts.token_vault.to_account_info(),
        }, signer);
        token::transfer(cpi_ctx, ctx.accounts.token_vault_nested_ata.amount)?;

        //close the token account
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::CloseAccount {
                account: ctx.accounts.token_vault_nested_ata.to_account_info(),
                destination: ctx.accounts.refundee.to_account_info(),
                authority: ctx.accounts.token_vault.to_account_info(),
            },
            signer,
        );
        token::close_account(cpi_ctx)?;

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

#[derive(Accounts)]
pub struct WithdrawNested<'info> {
    #[account(mut)]
    refundee: SystemAccount<'info>,

    #[account(
        address = constants::STEP_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
    )]
    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [token_mint.key().as_ref()],
        bump,
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = token_vault,
    )]
    pub token_vault_nested_ata: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
