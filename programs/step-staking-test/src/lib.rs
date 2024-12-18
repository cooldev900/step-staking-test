use anchor_lang::prelude::*;

declare_id!("7ZYww9sNB9iJKYCh3LefK2RiczAHddTLZ8dz9SGSfXzJ");

#[program]
pub mod step_staking_test {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
