use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("8qhVJz6o9H9DAbU5DjiFqG2rWVu7qV51BabEpfsawnEa");

#[program]
pub mod workspace {
    use super::*;

    // fee_lamports: u64, Passport minting fee in lamports, 1000000000 = 1 SOL
    // max_stamps: u8, Maximum travel stamps per passport, 50
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        fee_lamports: u64,
        max_stamps: u8,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.bump = ctx.bumps.config;
        config.authority = ctx.accounts.authority.key();
        config.is_active = true;
        config.is_paused = false;
        config.version = 1;
        config.fee_lamports = fee_lamports;
        config.max_stamps = max_stamps;
        config.total_passports = 0;
        config.total_stamps = 0;
        Ok(())
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        fee_lamports: u64,
        max_stamps: u8,
        is_paused: bool,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.fee_lamports = fee_lamports;
        config.max_stamps = max_stamps;
        config.is_paused = is_paused;
        Ok(())
    }

    pub fn mint_passport(
        ctx: Context<MintPassport>,
        display_name: String,
        home_country: String,
    ) -> Result<()> {
        require!(display_name.len() <= 32, ErrorCode::InvalidParameter);
        require!(home_country.len() <= 32, ErrorCode::InvalidParameter);

        let config = &ctx.accounts.config;
        require!(config.is_active && !config.is_paused, ErrorCode::ConfigInactive);

        let fee = config.fee_lamports;
        if fee > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.traveler.to_account_info(),
                        to: ctx.accounts.authority.to_account_info(),
                    },
                ),
                fee,
            )?;
        }

        let authority_key = ctx.accounts.authority.key();
        let bump_arr = [ctx.bumps.passport_mint];
        let traveler_key = ctx.accounts.traveler.key();
        let seeds = &[
            b"passport_mint",
            authority_key.as_ref(),
            traveler_key.as_ref(),
            &bump_arr,
        ];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.passport_mint.to_account_info(),
                    to: ctx.accounts.traveler_token.to_account_info(),
                    authority: ctx.accounts.passport_mint.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;

        let passport = &mut ctx.accounts.passport;
        passport.bump = ctx.bumps.passport;
        passport.owner = ctx.accounts.traveler.key();
        passport.mint = ctx.accounts.passport_mint.key();
        passport.display_name = display_name;
        passport.home_country = home_country;
        passport.stamp_count = 0;
        passport.created_at = Clock::get()?.unix_timestamp;
        passport.is_active = true;

        let config = &mut ctx.accounts.config;
        config.total_passports = config.total_passports.checked_add(1).ok_or(ErrorCode::MathOverflow)?;

        Ok(())
    }

    pub fn add_stamp(
        ctx: Context<AddStamp>,
        country: String,
        city: String,
        note: String,
    ) -> Result<()> {
        require!(country.len() <= 32, ErrorCode::InvalidParameter);
        require!(city.len() <= 32, ErrorCode::InvalidParameter);
        require!(note.len() <= 64, ErrorCode::InvalidParameter);

        let config = &ctx.accounts.config;
        require!(config.is_active && !config.is_paused, ErrorCode::ConfigInactive);

        let passport = &ctx.accounts.passport;
        require!(passport.is_active, ErrorCode::InactiveAccount);
        require!(passport.stamp_count < config.max_stamps, ErrorCode::MaxStampsReached);

        let stamp = &mut ctx.accounts.stamp;
        stamp.bump = ctx.bumps.stamp;
        stamp.passport = ctx.accounts.passport.key();
        stamp.traveler = ctx.accounts.traveler.key();
        stamp.country = country;
        stamp.city = city;
        stamp.note = note;
        stamp.stamped_at = Clock::get()?.unix_timestamp;
        stamp.stamp_index = passport.stamp_count;

        let passport = &mut ctx.accounts.passport;
        passport.stamp_count = passport.stamp_count.checked_add(1).ok_or(ErrorCode::MathOverflow)?;

        let config = &mut ctx.accounts.config;
        config.total_stamps = config.total_stamps.checked_add(1).ok_or(ErrorCode::MathOverflow)?;

        Ok(())
    }

    pub fn deactivate_passport(ctx: Context<DeactivatePassport>) -> Result<()> {
        let passport = &mut ctx.accounts.passport;
        require!(passport.is_active, ErrorCode::InactiveAccount);
        passport.is_active = false;
        Ok(())
    }
}

// ── Accounts ────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        seeds = [b"config", authority.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + Config::LEN,
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [b"config", authority.key().as_ref()],
        bump = config.bump,
        has_one = authority @ ErrorCode::Unauthorized,
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct MintPassport<'info> {
    #[account(
        mut,
        seeds = [b"config", authority.key().as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,
    #[account(
        init,
        seeds = [b"passport_mint", authority.key().as_ref(), traveler.key().as_ref()],
        bump,
        payer = traveler,
        mint::decimals = 0,
        mint::authority = passport_mint,
    )]
    pub passport_mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = traveler,
        associated_token::mint = passport_mint,
        associated_token::authority = traveler,
    )]
    pub traveler_token: Account<'info, TokenAccount>,
    #[account(
        init,
        seeds = [b"passport", traveler.key().as_ref()],
        bump,
        payer = traveler,
        space = 8 + Passport::LEN,
    )]
    pub passport: Account<'info, Passport>,
    #[account(mut)]
    pub traveler: Signer<'info>,
    /// CHECK: Verified via config seeds; receives minting fee
    #[account(
        mut,
        constraint = authority.key() == config.authority @ ErrorCode::Unauthorized,
    )]
    pub authority: UncheckedAccount<'info>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ACCOUNTS: 1.config 2.passport 3.stamp 4.traveler 5.system_program = 5 (✅ ≤8)
#[derive(Accounts)]
#[instruction(country: String, city: String, note: String)]
pub struct AddStamp<'info> {
    #[account(
        mut,
        seeds = [b"config", config.authority.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"passport", traveler.key().as_ref()],
        bump = passport.bump,
        constraint = passport.owner == traveler.key() @ ErrorCode::Unauthorized,
        constraint = passport.is_active @ ErrorCode::InactiveAccount,
    )]
    pub passport: Account<'info, Passport>,
    #[account(
        init,
        seeds = [b"stamp", passport.key().as_ref(), &passport.stamp_count.to_le_bytes()],
        bump,
        payer = traveler,
        space = 8 + Stamp::LEN,
    )]
    pub stamp: Account<'info, Stamp>,
    #[account(mut)]
    pub traveler: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeactivatePassport<'info> {
    #[account(
        seeds = [b"config", authority.key().as_ref()],
        bump = config.bump,
        has_one = authority @ ErrorCode::Unauthorized,
    )]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"passport", passport.owner.as_ref()],
        bump = passport.bump,
    )]
    pub passport: Account<'info, Passport>,
    pub authority: Signer<'info>,
}

// ── State ───────────────────────────────────────────────────────────────

#[account]
pub struct Config {
    pub bump: u8,
    pub authority: Pubkey,
    pub is_active: bool,
    pub is_paused: bool,
    pub version: u8,
    pub fee_lamports: u64,
    pub max_stamps: u8,
    pub total_passports: u64,
    pub total_stamps: u64,
}

impl Config {
    pub const LEN: usize = 1 + 32 + 1 + 1 + 1 + 8 + 1 + 8 + 8;
}

#[account]
pub struct Passport {
    pub bump: u8,
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub display_name: String,
    pub home_country: String,
    pub stamp_count: u8,
    pub created_at: i64,
    pub is_active: bool,
}

impl Passport {
    pub const LEN: usize = 1 + 32 + 32 + (4 + 32) + (4 + 32) + 1 + 8 + 1;
}

#[account]
pub struct Stamp {
    pub bump: u8,
    pub passport: Pubkey,
    pub traveler: Pubkey,
    pub country: String,
    pub city: String,
    pub note: String,
    pub stamped_at: i64,
    pub stamp_index: u8,
}

impl Stamp {
    pub const LEN: usize = 1 + 32 + 32 + (4 + 32) + (4 + 32) + (4 + 64) + 8 + 1;
}

// ── Errors ──────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Math overflow occurred")]
    MathOverflow,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Config is inactive or paused")]
    ConfigInactive,
    #[msg("Account is inactive")]
    InactiveAccount,
    #[msg("Invalid parameter")]
    InvalidParameter,
    #[msg("Maximum stamps reached")]
    MaxStampsReached,
}
