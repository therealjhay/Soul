use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo,
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    sysvar::Sysvar,
};

entrypoint!(process_instruction);

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub enum RgpInstruction {
    RegisterIdentity {
        identity_id: u64,
        metadata_uri: String,
    },
    DeactivateIdentity {
        identity_id: u64,
    },
    MintSbt {
        token_id: u64,
        context: String,
        metadata_uri: String,
        expires_at: i64,
    },
    RevokeSbt {
        token_id: u64,
    },
    CreateAttestation {
        attestation_id: u64,
        from_identity_id: u64,
        to_identity_id: u64,
        weight: u8,
        context: String,
        metadata_uri: String,
    },
    UpdateAttestation {
        attestation_id: u64,
        weight: u8,
        metadata_uri: String,
    },
    RevokeAttestation {
        attestation_id: u64,
        from_identity_id: u64,
        to_identity_id: u64,
    },
}

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone)]
pub struct IdentityAccount {
    pub identity_id: u64,
    pub owner: Pubkey,
    pub metadata_uri: String,
    pub active: bool,
    pub updated_at: i64,
}

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone)]
pub struct SbtAccount {
    pub token_id: u64,
    pub holder: Pubkey,
    pub issuer: Pubkey,
    pub context: String,
    pub metadata_uri: String,
    pub expires_at: i64,
    pub revoked: bool,
    pub updated_at: i64,
}

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone)]
pub struct AttestationAccount {
    pub attestation_id: u64,
    pub from_identity_id: u64,
    pub to_identity_id: u64,
    pub attestor: Pubkey,
    pub weight: u8,
    pub context: String,
    pub metadata_uri: String,
    pub revoked: bool,
    pub updated_at: i64,
}

#[repr(u32)]
enum RgpError {
    MissingSigner = 1,
    InvalidInstruction = 2,
    InvalidWeight = 3,
    InvalidProgramOwner = 4,
    Unauthorized = 5,
}

impl From<RgpError> for ProgramError {
    fn from(value: RgpError) -> Self {
        ProgramError::Custom(value as u32)
    }
}

pub fn process_instruction<'a>(
    program_id: &Pubkey,
    accounts: &'a [AccountInfo<'a>],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = RgpInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::from(RgpError::InvalidInstruction))?;
    let now = Clock::get()?.unix_timestamp;

    match instruction {
        RgpInstruction::RegisterIdentity {
            identity_id,
            metadata_uri,
        } => {
            let [authority, identity_account] = account_pair(accounts)?;
            require_signer(authority)?;
            require_program_owned(identity_account, program_id)?;

            let state = IdentityAccount {
                identity_id,
                owner: *authority.key,
                metadata_uri: metadata_uri.clone(),
                active: true,
                updated_at: now,
            };
            write_state(identity_account, &state)?;
            msg!(
                "RGP:IDENTITY_REGISTERED:{}:{}:{}",
                identity_id,
                authority.key,
                metadata_uri
            );
        }
        RgpInstruction::DeactivateIdentity { identity_id } => {
            let [authority, identity_account] = account_pair(accounts)?;
            require_signer(authority)?;
            require_program_owned(identity_account, program_id)?;

            let mut state: IdentityAccount = read_state(identity_account)?;
            if state.identity_id != identity_id || state.owner != *authority.key {
                return Err(RgpError::Unauthorized.into());
            }
            state.active = false;
            state.updated_at = now;
            write_state(identity_account, &state)?;
            msg!("RGP:IDENTITY_DEACTIVATED:{}", identity_id);
        }
        RgpInstruction::MintSbt {
            token_id,
            context,
            metadata_uri,
            expires_at,
        } => {
            let [issuer, sbt_account, holder_account] = account_triple(accounts)?;
            require_signer(issuer)?;
            require_program_owned(sbt_account, program_id)?;

            let state = SbtAccount {
                token_id,
                holder: *holder_account.key,
                issuer: *issuer.key,
                context: context.clone(),
                metadata_uri,
                expires_at,
                revoked: false,
                updated_at: now,
            };
            write_state(sbt_account, &state)?;
            msg!(
                "RGP:SBT_MINTED:{}:{}:{}",
                token_id,
                holder_account.key,
                context
            );
        }
        RgpInstruction::RevokeSbt { token_id } => {
            let [issuer, sbt_account] = account_pair(accounts)?;
            require_signer(issuer)?;
            require_program_owned(sbt_account, program_id)?;

            let mut state: SbtAccount = read_state(sbt_account)?;
            if state.token_id != token_id || state.issuer != *issuer.key {
                return Err(RgpError::Unauthorized.into());
            }
            state.revoked = true;
            state.updated_at = now;
            write_state(sbt_account, &state)?;
            msg!("RGP:SBT_REVOKED:{}", token_id);
        }
        RgpInstruction::CreateAttestation {
            attestation_id,
            from_identity_id,
            to_identity_id,
            weight,
            context,
            metadata_uri,
        } => {
            let [attestor, attestation_account] = account_pair(accounts)?;
            require_signer(attestor)?;
            require_program_owned(attestation_account, program_id)?;
            if !(1..=100).contains(&weight) {
                return Err(RgpError::InvalidWeight.into());
            }

            let state = AttestationAccount {
                attestation_id,
                from_identity_id,
                to_identity_id,
                attestor: *attestor.key,
                weight,
                context: context.clone(),
                metadata_uri,
                revoked: false,
                updated_at: now,
            };
            write_state(attestation_account, &state)?;
            msg!(
                "RGP:ATTESTATION_CREATED:{}:{}:{}:{}:{}",
                attestation_id,
                from_identity_id,
                to_identity_id,
                weight,
                context
            );
        }
        RgpInstruction::UpdateAttestation {
            attestation_id,
            weight,
            metadata_uri,
        } => {
            let [attestor, attestation_account] = account_pair(accounts)?;
            require_signer(attestor)?;
            require_program_owned(attestation_account, program_id)?;
            if !(1..=100).contains(&weight) {
                return Err(RgpError::InvalidWeight.into());
            }

            let mut state: AttestationAccount = read_state(attestation_account)?;
            if state.attestation_id != attestation_id || state.attestor != *attestor.key {
                return Err(RgpError::Unauthorized.into());
            }
            state.weight = weight;
            state.metadata_uri = metadata_uri;
            state.updated_at = now;
            write_state(attestation_account, &state)?;
            msg!("RGP:ATTESTATION_UPDATED:{}:{}", attestation_id, weight);
        }
        RgpInstruction::RevokeAttestation {
            attestation_id,
            from_identity_id,
            to_identity_id,
        } => {
            let [attestor, attestation_account] = account_pair(accounts)?;
            require_signer(attestor)?;
            require_program_owned(attestation_account, program_id)?;

            let mut state: AttestationAccount = read_state(attestation_account)?;
            if state.attestation_id != attestation_id
                || state.attestor != *attestor.key
                || state.from_identity_id != from_identity_id
                || state.to_identity_id != to_identity_id
            {
                return Err(RgpError::Unauthorized.into());
            }
            state.revoked = true;
            state.updated_at = now;
            write_state(attestation_account, &state)?;
            msg!(
                "RGP:ATTESTATION_REVOKED:{}:{}:{}",
                attestation_id,
                from_identity_id,
                to_identity_id
            );
        }
    }

    Ok(())
}

fn account_pair<'a>(accounts: &'a [AccountInfo<'a>]) -> Result<[&'a AccountInfo<'a>; 2], ProgramError> {
    if accounts.len() < 2 {
        return Err(ProgramError::NotEnoughAccountKeys);
    }
    Ok([&accounts[0], &accounts[1]])
}

fn account_triple<'a>(
    accounts: &'a [AccountInfo<'a>],
) -> Result<[&'a AccountInfo<'a>; 3], ProgramError> {
    if accounts.len() < 3 {
        return Err(ProgramError::NotEnoughAccountKeys);
    }
    Ok([&accounts[0], &accounts[1], &accounts[2]])
}

fn require_signer(account: &AccountInfo) -> ProgramResult {
    if !account.is_signer {
        return Err(RgpError::MissingSigner.into());
    }
    Ok(())
}

fn require_program_owned(account: &AccountInfo, program_id: &Pubkey) -> ProgramResult {
    if account.owner != program_id {
        return Err(RgpError::InvalidProgramOwner.into());
    }
    Ok(())
}

fn read_state<T: BorshDeserialize>(account: &AccountInfo) -> Result<T, ProgramError> {
    T::try_from_slice(&account.data.borrow()).map_err(|_| ProgramError::InvalidAccountData)
}

fn write_state<T: BorshSerialize>(account: &AccountInfo, state: &T) -> ProgramResult {
    state
        .serialize(&mut &mut account.data.borrow_mut()[..])
        .map_err(|_| ProgramError::AccountDataTooSmall)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn instruction_roundtrip_register_identity() {
        let ix = RgpInstruction::RegisterIdentity {
            identity_id: 7,
            metadata_uri: "ipfs://identity/7".to_string(),
        };
        let bytes = borsh::to_vec(&ix).expect("serialize");
        let parsed = RgpInstruction::try_from_slice(&bytes).expect("deserialize");
        match parsed {
            RgpInstruction::RegisterIdentity {
                identity_id,
                metadata_uri,
            } => {
                assert_eq!(identity_id, 7);
                assert_eq!(metadata_uri, "ipfs://identity/7");
            }
            _ => panic!("unexpected variant"),
        }
    }

    #[test]
    fn instruction_roundtrip_create_attestation() {
        let ix = RgpInstruction::CreateAttestation {
            attestation_id: 11,
            from_identity_id: 1,
            to_identity_id: 2,
            weight: 80,
            context: "defi".to_string(),
            metadata_uri: "ipfs://att/11".to_string(),
        };
        let bytes = borsh::to_vec(&ix).expect("serialize");
        let parsed = RgpInstruction::try_from_slice(&bytes).expect("deserialize");
        match parsed {
            RgpInstruction::CreateAttestation { weight, context, .. } => {
                assert_eq!(weight, 80);
                assert_eq!(context, "defi");
            }
            _ => panic!("unexpected variant"),
        }
    }
}
