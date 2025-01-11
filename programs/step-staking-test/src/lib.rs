use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{spl_token::instruction::AuthorityType, Mint, Token, TokenAccount},
};

declare_id!("7ZYww9sNB9iJKYCh3LefK2RiczAHddTLZ8dz9SGSfXzJ");

// pub mod constants {
//     pub const STEP_TOKEN_MINT_PUBKEY: &str = "2bgQCuwVFaFMDxmhtunFFgysEbZFJmLteHUkiiLC4Kzd";
//     pub const X_STEP_TOKEN_MINT_PUBKEY: &str = "J7d8BestX7duYo1eMW16EUaCcRKLNk2sVUGBGJT9LRa";
// }

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
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.token_vault_nested_ata.to_account_info(),
                to: ctx.accounts.token_vault.to_account_info(),
                authority: ctx.accounts.token_vault.to_account_info(),
            },
            signer,
        );
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

    pub fn reclaim_mint_authority(ctx: Context<ReclaimMintAuthority>, nonce: u8) -> Result<()> {
        let token_mint_key = ctx.accounts.token_mint.key();
        let seeds = &[token_mint_key.as_ref(), &[nonce]];
        let signer = [&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::SetAuthority {
                current_authority: ctx.accounts.token_vault.to_account_info(),
                account_or_mint: ctx.accounts.x_token_mint.to_account_info(),
            },
            &signer,
        );
        token::set_authority(
            cpi_ctx,
            AuthorityType::MintTokens,
            Some(ctx.accounts.token_mint.mint_authority.unwrap()),
        )?;
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, nonce: u8, amount: u64) -> Result<()> {
        let total_token = ctx.accounts.token_vault.amount;
        let total_x_token = ctx.accounts.x_token_mint.supply;
        let old_price = get_price(&ctx.accounts.token_vault, &ctx.accounts.x_token_mint);

        let token_mint_key = ctx.accounts.token_mint.key();
        let seeds = &[token_mint_key.as_ref(), &[nonce]];
        let signer = [&seeds[..]];

        if total_token == 0 || total_x_token == 0 {
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.x_token_mint.to_account_info(),
                    to: ctx.accounts.x_token_to.to_account_info(),
                    authority: ctx.accounts.token_vault.to_account_info(),
                },
                &signer,
            );
            token::mint_to(cpi_ctx, amount)?;
        } else {
            let what: u64 = (amount as u128)
                .checked_mul(total_x_token as u128)
                .unwrap()
                .checked_div(total_token as u128)
                .unwrap()
                .try_into()
                .unwrap();

            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.x_token_mint.to_account_info(),
                    to: ctx.accounts.x_token_to.to_account_info(),
                    authority: ctx.accounts.token_vault.to_account_info(),
                },
                &signer,
            );
            token::mint_to(cpi_ctx, what)?;
        }

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.token_from.to_account_info(),
                to: ctx.accounts.token_vault.to_account_info(),
                authority: ctx.accounts.token_from_authority.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, amount)?;

        ctx.accounts.token_vault.reload()?;
        ctx.accounts.x_token_mint.reload()?;

        let new_price = get_price(&ctx.accounts.token_vault, &ctx.accounts.x_token_mint);

        emit!(PriceChange {
            old_step_per_xstep_e9: old_price.0,
            old_step_per_xstep: old_price.1,
            new_step_per_xstep_e9: new_price.0,
            new_step_per_xstep: new_price.1,
        });

        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>, nonce: u8, amount: u64) -> Result<()> {
        let total_token = ctx.accounts.token_vault.amount;
        let total_x_token = ctx.accounts.x_token_mint.supply;
        let old_price = get_price(&ctx.accounts.token_vault, &ctx.accounts.x_token_mint);

        //burn what is being sent
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.x_token_mint.to_account_info(),
                from: ctx.accounts.x_token_from.to_account_info(),
                authority: ctx.accounts.x_token_from_authority.to_account_info(),
            },
        );
        token::burn(cpi_ctx, amount)?;

        //determine user share of vault
        let what: u64 = (amount as u128)
            .checked_mul(total_token as u128)
            .unwrap()
            .checked_div(total_x_token as u128)
            .unwrap()
            .try_into()
            .unwrap();

        //compute vault signer seeds
        let token_mint_key = ctx.accounts.token_mint.key();
        let seeds = &[token_mint_key.as_ref(), &[nonce]];
        let signer = &[&seeds[..]];

        //transfer from vault to user
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.token_vault.to_account_info(),
                to: ctx.accounts.token_to.to_account_info(),
                authority: ctx.accounts.token_vault.to_account_info(),
            },
            signer,
        );
        token::transfer(cpi_ctx, what)?;

        ctx.accounts.token_vault.reload()?;
        ctx.accounts.x_token_mint.reload()?;

        let new_price = get_price(&ctx.accounts.token_vault, &ctx.accounts.x_token_mint);

        emit!(PriceChange {
            old_step_per_xstep_e9: old_price.0,
            old_step_per_xstep: old_price.1,
            new_step_per_xstep_e9: new_price.0,
            new_step_per_xstep: new_price.1,
        });

        Ok(())
    }
}

const E9: u128 = 1000000000;

pub fn get_price<'info>(
    vault: &Account<'info, TokenAccount>,
    mint: &Account<'info, Mint>,
) -> (u64, String) {
    let total_token = vault.amount;
    let total_x_token = mint.supply;

    if total_x_token == 0 {
        return (0, String::from("0"));
    }

    let price_uint = (total_token as u128)
        .checked_mul(E9)
        .unwrap()
        .checked_div(total_x_token as u128)
        .unwrap()
        .try_into()
        .unwrap();
    let price_float = (total_token as f64) / (total_x_token as f64);
    (price_uint, price_float.to_string())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    // #[account(
    //     address = constants::STEP_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
    // )]
    #[account()]
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
        seeds = [token_mint.key().as_ref()],
        bump,
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,
}

#[derive(Accounts)]
pub struct WithdrawNested<'info> {
    #[account(mut)]
    refundee: SystemAccount<'info>,

    // #[account(
    //     address = constants::STEP_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
    // )]
    #[account()]
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

#[derive(Accounts)]
#[instruction(nonce: u8)]
pub struct ReclaimMintAuthority<'info> {
    // #[account(
    //     address = constants::STEP_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
    // )]
    #[account(mut)]
    pub token_mint: Box<Account<'info, Mint>>,

    // #[account(
    //     mut,
    //     address = constants::X_STEP_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
    // )]
    #[account(mut)]
    pub x_token_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [ token_mint.key().as_ref() ],
        bump = nonce,
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        //only STEP's token authority can sign for this action
        address = token_mint.mint_authority.unwrap(),
    )]
    ///the mint authority of the step token
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(nonce: u8)]
pub struct Stake<'info> {
    // #[account(
    //     address = constants::STEP_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
    // )]
    #[account()]
    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        // address = constants::X_STEP_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
    )]
    pub x_token_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    //the token account to withdraw from
    pub token_from: Box<Account<'info, TokenAccount>>,

    //the authority allowed to transfer from token_from
    pub token_from_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [ token_mint.key().as_ref() ],
        bump = nonce,
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    //the token account to send xtoken
    pub x_token_to: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(nonce: u8)]
pub struct Unstake<'info> {
    // #[account(
    //     address = constants::STEP_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
    // )]
    #[account()]
    pub token_mint: Box<Account<'info, Mint>>,

    // #[account(
    //     mut,
    //     address = constants::X_STEP_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
    // )]
    #[account(mut)]
    pub x_token_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    //the token account to withdraw from
    pub x_token_from: Box<Account<'info, TokenAccount>>,

    //the authority allowed to transfer from x_token_from
    pub x_token_from_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [ token_mint.key().as_ref() ],
        bump = nonce,
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    //the token account to send token
    pub token_to: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

#[event]
pub struct PriceChange {
    pub old_step_per_xstep_e9: u64,
    pub old_step_per_xstep: String,
    pub new_step_per_xstep_e9: u64,
    pub new_step_per_xstep: String,
}

#[event]
pub struct Price {
    pub step_per_xstep_e9: u64,
    pub step_per_xstep: String,
}
