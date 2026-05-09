create table if not exists users (
  wallet text primary key,
  created_at timestamptz not null default now()
);

create table if not exists credentials (
  id uuid primary key,
  owner_wallet text not null references users(wallet),
  credential_pda text,
  nft_mint text,
  type text not null,
  status text not null,
  encrypted_cid text not null,
  metadata_uri text,
  document_commitment text not null,
  agent_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists share_links (
  id uuid primary key,
  credential_id uuid not null references credentials(id),
  verifier_wallet text,
  token_hash text not null,
  scope jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  revoked boolean not null default false
);

create table if not exists verification_events (
  id uuid primary key,
  credential_id uuid not null references credentials(id),
  event_type text not null,
  tx_signature text,
  actor_wallet text,
  created_at timestamptz not null default now()
);
