use anchor_lang::prelude::*;

declare_id!("Nomad11111111111111111111111111111111111111");

#[program]
pub mod nomadpass {
    use super::*;

    pub fn initialize_profile(ctx: Context<InitializeProfile>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        profile.authority = ctx.accounts.authority.key();
        profile.created_at = Clock::get()?.unix_timestamp;
        profile.credential_count = 0;
        profile.bump = ctx.bumps.profile;

        emit!(ProfileCreated {
            profile: profile.key(),
            authority: profile.authority,
        });

        Ok(())
    }

    pub fn create_credential(
        ctx: Context<CreateCredential>,
        credential_id: [u8; 32],
        credential_type: CredentialType,
        encrypted_cid_hash: [u8; 32],
        metadata_uri_hash: [u8; 32],
        document_commitment: [u8; 32],
        expires_at: i64,
    ) -> Result<()> {
        require!(
            expires_at > Clock::get()?.unix_timestamp,
            NomadPassError::InvalidExpiry
        );

        let credential = &mut ctx.accounts.credential;
        let profile = &mut ctx.accounts.profile;

        credential.owner = ctx.accounts.owner.key();
        credential.credential_id = credential_id;
        credential.credential_type = credential_type;
        credential.state = CredentialState::Pending;
        credential.issuer = Pubkey::default();
        credential.nft_mint = Pubkey::default();
        credential.encrypted_cid_hash = encrypted_cid_hash;
        credential.metadata_uri_hash = metadata_uri_hash;
        credential.document_commitment = document_commitment;
        credential.issued_at = Clock::get()?.unix_timestamp;
        credential.expires_at = expires_at;
        credential.bump = ctx.bumps.credential;

        profile.credential_count = profile
            .credential_count
            .checked_add(1)
            .ok_or(NomadPassError::MathOverflow)?;

        emit!(CredentialCreated {
            credential: credential.key(),
            owner: credential.owner,
            credential_type,
        });

        Ok(())
    }

    pub fn mark_agent_reviewed(ctx: Context<MutateCredential>) -> Result<()> {
        let credential = &mut ctx.accounts.credential;
        require!(
            credential.state == CredentialState::Pending,
            NomadPassError::InvalidState
        );
        credential.state = CredentialState::AgentReviewed;

        emit!(CredentialStateChanged {
            credential: credential.key(),
            state: CredentialState::AgentReviewed,
        });

        Ok(())
    }

    pub fn verify_credential(ctx: Context<VerifyCredential>, nft_mint: Pubkey) -> Result<()> {
        let credential = &mut ctx.accounts.credential;
        require!(
            credential.state == CredentialState::AgentReviewed
                || credential.state == CredentialState::Pending,
            NomadPassError::InvalidState
        );

        credential.state = CredentialState::Verified;
        credential.issuer = ctx.accounts.issuer.key();
        credential.nft_mint = nft_mint;

        emit!(CredentialVerified {
            credential: credential.key(),
            issuer: credential.issuer,
            nft_mint,
        });

        Ok(())
    }

    pub fn reject_credential(ctx: Context<VerifyCredential>, reason_code: u16) -> Result<()> {
        let credential = &mut ctx.accounts.credential;
        credential.state = CredentialState::Rejected;

        emit!(CredentialRejected {
            credential: credential.key(),
            issuer: ctx.accounts.issuer.key(),
            reason_code,
        });

        Ok(())
    }

    pub fn revoke_credential(ctx: Context<MutateCredential>) -> Result<()> {
        let credential = &mut ctx.accounts.credential;
        credential.state = CredentialState::Revoked;

        emit!(CredentialStateChanged {
            credential: credential.key(),
            state: CredentialState::Revoked,
        });

        Ok(())
    }

    pub fn create_share_grant(
        ctx: Context<CreateShareGrant>,
        scope: ShareScope,
        expires_at: i64,
    ) -> Result<()> {
        require!(
            ctx.accounts.credential.state == CredentialState::Verified,
            NomadPassError::InvalidState
        );
        require!(
            expires_at > Clock::get()?.unix_timestamp,
            NomadPassError::InvalidExpiry
        );

        let grant = &mut ctx.accounts.share_grant;
        grant.credential = ctx.accounts.credential.key();
        grant.owner = ctx.accounts.owner.key();
        grant.verifier = ctx.accounts.verifier.key();
        grant.scope = scope;
        grant.expires_at = expires_at;
        grant.revoked = false;
        grant.bump = ctx.bumps.share_grant;

        emit!(ShareGrantCreated {
            grant: grant.key(),
            credential: grant.credential,
            verifier: grant.verifier,
            expires_at,
        });

        Ok(())
    }

    pub fn revoke_share_grant(ctx: Context<RevokeShareGrant>) -> Result<()> {
        let grant = &mut ctx.accounts.share_grant;
        grant.revoked = true;

        emit!(ShareGrantRevoked {
            grant: grant.key(),
            credential: grant.credential,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeProfile<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + UserProfile::SIZE,
        seeds = [b"profile", authority.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(credential_id: [u8; 32])]
pub struct CreateCredential<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"profile", owner.key().as_ref()],
        bump = profile.bump,
        constraint = profile.authority == owner.key() @ NomadPassError::Unauthorized
    )]
    pub profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = owner,
        space = 8 + Credential::SIZE,
        seeds = [b"credential", owner.key().as_ref(), credential_id.as_ref()],
        bump
    )]
    pub credential: Account<'info, Credential>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MutateCredential<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ NomadPassError::Unauthorized
    )]
    pub credential: Account<'info, Credential>,
}

#[derive(Accounts)]
pub struct VerifyCredential<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    #[account(mut)]
    pub credential: Account<'info, Credential>,
}

#[derive(Accounts)]
pub struct CreateShareGrant<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub verifier: SystemAccount<'info>,

    #[account(
        has_one = owner @ NomadPassError::Unauthorized
    )]
    pub credential: Account<'info, Credential>,

    #[account(
        init,
        payer = owner,
        space = 8 + ShareGrant::SIZE,
        seeds = [
            b"share",
            credential.key().as_ref(),
            verifier.key().as_ref()
        ],
        bump
    )]
    pub share_grant: Account<'info, ShareGrant>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeShareGrant<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ NomadPassError::Unauthorized
    )]
    pub share_grant: Account<'info, ShareGrant>,
}

#[account]
pub struct UserProfile {
    pub authority: Pubkey,
    pub created_at: i64,
    pub credential_count: u32,
    pub bump: u8,
}

impl UserProfile {
    pub const SIZE: usize = 32 + 8 + 4 + 1;
}

#[account]
pub struct Credential {
    pub owner: Pubkey,
    pub credential_id: [u8; 32],
    pub credential_type: CredentialType,
    pub state: CredentialState,
    pub issuer: Pubkey,
    pub nft_mint: Pubkey,
    pub encrypted_cid_hash: [u8; 32],
    pub metadata_uri_hash: [u8; 32],
    pub document_commitment: [u8; 32],
    pub issued_at: i64,
    pub expires_at: i64,
    pub bump: u8,
}

impl Credential {
    pub const SIZE: usize = 32 + 32 + 1 + 1 + 32 + 32 + 32 + 32 + 32 + 8 + 8 + 1;
}

#[account]
pub struct ShareGrant {
    pub credential: Pubkey,
    pub owner: Pubkey,
    pub verifier: Pubkey,
    pub scope: ShareScope,
    pub expires_at: i64,
    pub revoked: bool,
    pub bump: u8,
}

impl ShareGrant {
    pub const SIZE: usize = 32 + 32 + 32 + ShareScope::SIZE + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CredentialType {
    Passport,
    IdentityCard,
    UniversityCertificate,
    WorkCredential,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CredentialState {
    Pending,
    AgentReviewed,
    Verified,
    Rejected,
    Revoked,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct ShareScope {
    pub reveal_name: bool,
    pub reveal_document_type: bool,
    pub reveal_expiry: bool,
    pub allow_file_access: bool,
}

impl ShareScope {
    pub const SIZE: usize = 4;
}

#[event]
pub struct ProfileCreated {
    pub profile: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct CredentialCreated {
    pub credential: Pubkey,
    pub owner: Pubkey,
    pub credential_type: CredentialType,
}

#[event]
pub struct CredentialVerified {
    pub credential: Pubkey,
    pub issuer: Pubkey,
    pub nft_mint: Pubkey,
}

#[event]
pub struct CredentialRejected {
    pub credential: Pubkey,
    pub issuer: Pubkey,
    pub reason_code: u16,
}

#[event]
pub struct CredentialStateChanged {
    pub credential: Pubkey,
    pub state: CredentialState,
}

#[event]
pub struct ShareGrantCreated {
    pub grant: Pubkey,
    pub credential: Pubkey,
    pub verifier: Pubkey,
    pub expires_at: i64,
}

#[event]
pub struct ShareGrantRevoked {
    pub grant: Pubkey,
    pub credential: Pubkey,
}

#[error_code]
pub enum NomadPassError {
    #[msg("The signer is not authorized for this credential.")]
    Unauthorized,
    #[msg("The requested state transition is invalid.")]
    InvalidState,
    #[msg("The expiry timestamp must be in the future.")]
    InvalidExpiry,
    #[msg("Math overflow.")]
    MathOverflow,
}
