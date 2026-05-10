import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Workspace } from "../target/types/workspace";
import { expect } from "chai";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

describe("NomadPass", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.workspace as Program<Workspace>;

  const authority = Keypair.generate();
  const traveler1 = Keypair.generate();
  const traveler2 = Keypair.generate();

  let configPDA: PublicKey;
  let passport1PDA: PublicKey;
  let passport2PDA: PublicKey;
  let passportMint1PDA: PublicKey;
  let passportMint2PDA: PublicKey;

  const FEE_LAMPORTS = new BN(100_000_000); // 0.1 SOL
  const MAX_STAMPS = 50;

  before(async () => {
    // Fund all accounts with 100 SOL
    for (const kp of [authority, traveler1, traveler2]) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          kp.publicKey,
          100 * LAMPORTS_PER_SOL
        )
      );
    }

    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), authority.publicKey.toBuffer()],
      program.programId
    );

    [passport1PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("passport"), traveler1.publicKey.toBuffer()],
      program.programId
    );

    [passport2PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("passport"), traveler2.publicKey.toBuffer()],
      program.programId
    );

    [passportMint1PDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("passport_mint"),
        authority.publicKey.toBuffer(),
        traveler1.publicKey.toBuffer(),
      ],
      program.programId
    );

    [passportMint2PDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("passport_mint"),
        authority.publicKey.toBuffer(),
        traveler2.publicKey.toBuffer(),
      ],
      program.programId
    );
  });

  it("Initialize Config", async () => {
    await program.methods
      .initializeConfig(FEE_LAMPORTS, MAX_STAMPS)
      .accounts({
        config: configPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const config = await program.account.config.fetch(configPDA);
    expect(config.isActive).to.be.true;
    expect(config.isPaused).to.be.false;
    expect(Number(config.feeLamports.toString())).to.equal(100_000_000);
    expect(config.maxStamps).to.equal(MAX_STAMPS);
    expect(Number(config.totalPassports.toString())).to.equal(0);
    expect(config.version).to.equal(1);
  });

  it("Mint Passport for Traveler 1", async () => {
    const travelerToken = await getAssociatedTokenAddress(
      passportMint1PDA,
      traveler1.publicKey
    );

    const authorityBefore = await provider.connection.getBalance(
      authority.publicKey
    );

    await program.methods
      .mintPassport("Alice Nomad", "South Africa")
      .accounts({
        config: configPDA,
        passportMint: passportMint1PDA,
        travelerToken: travelerToken,
        passport: passport1PDA,
        traveler: traveler1.publicKey,
        authority: authority.publicKey,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([traveler1])
      .rpc();

    const passport = await program.account.passport.fetch(passport1PDA);
    expect(passport.displayName).to.equal("Alice Nomad");
    expect(passport.homeCountry).to.equal("South Africa");
    expect(passport.stampCount).to.equal(0);
    expect(passport.isActive).to.be.true;
    expect(passport.owner.toBase58()).to.equal(
      traveler1.publicKey.toBase58()
    );

    const tokenData = await getAccount(provider.connection, travelerToken);
    expect(Number(tokenData.amount)).to.equal(1);

    const authorityAfter = await provider.connection.getBalance(
      authority.publicKey
    );
    expect(authorityAfter - authorityBefore).to.be.greaterThanOrEqual(
      Number(FEE_LAMPORTS)
    );

    const config = await program.account.config.fetch(configPDA);
    expect(Number(config.totalPassports.toString())).to.equal(1);
  });

  it("Mint Passport for Traveler 2", async () => {
    const travelerToken = await getAssociatedTokenAddress(
      passportMint2PDA,
      traveler2.publicKey
    );

    await program.methods
      .mintPassport("Bob Explorer", "Brazil")
      .accounts({
        config: configPDA,
        passportMint: passportMint2PDA,
        travelerToken: travelerToken,
        passport: passport2PDA,
        traveler: traveler2.publicKey,
        authority: authority.publicKey,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([traveler2])
      .rpc();

    const passport = await program.account.passport.fetch(passport2PDA);
    expect(passport.displayName).to.equal("Bob Explorer");
    expect(passport.homeCountry).to.equal("Brazil");
    expect(passport.isActive).to.be.true;

    const config = await program.account.config.fetch(configPDA);
    expect(Number(config.totalPassports.toString())).to.equal(2);
  });

  it("Add Stamp - Traveler 1 visits Japan", async () => {
    const [stampPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stamp"),
        passport1PDA.toBuffer(),
        new BN(0).toArrayLike(Buffer, "le", 1),
      ],
      program.programId
    );

    await program.methods
      .addStamp("Japan", "Tokyo", "Cherry blossom season!")
      .accounts({
        config: configPDA,
        passport: passport1PDA,
        stamp: stampPDA,
        traveler: traveler1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([traveler1])
      .rpc();

    const stamp = await program.account.stamp.fetch(stampPDA);
    expect(stamp.country).to.equal("Japan");
    expect(stamp.city).to.equal("Tokyo");
    expect(stamp.note).to.equal("Cherry blossom season!");
    expect(stamp.stampIndex).to.equal(0);
    expect(Number(stamp.stampedAt.toString())).to.be.greaterThan(0);

    const passport = await program.account.passport.fetch(passport1PDA);
    expect(passport.stampCount).to.equal(1);

    const config = await program.account.config.fetch(configPDA);
    expect(Number(config.totalStamps.toString())).to.equal(1);
  });

  it("Add Stamp - Traveler 1 visits Portugal", async () => {
    const [stampPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stamp"),
        passport1PDA.toBuffer(),
        new BN(1).toArrayLike(Buffer, "le", 1),
      ],
      program.programId
    );

    await program.methods
      .addStamp("Portugal", "Lisbon", "Amazing co-working spaces")
      .accounts({
        config: configPDA,
        passport: passport1PDA,
        stamp: stampPDA,
        traveler: traveler1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([traveler1])
      .rpc();

    const stamp = await program.account.stamp.fetch(stampPDA);
    expect(stamp.country).to.equal("Portugal");
    expect(stamp.city).to.equal("Lisbon");
    expect(stamp.stampIndex).to.equal(1);

    const passport = await program.account.passport.fetch(passport1PDA);
    expect(passport.stampCount).to.equal(2);
  });

  it("Add Stamp - Traveler 2 visits Thailand", async () => {
    const [stampPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stamp"),
        passport2PDA.toBuffer(),
        new BN(0).toArrayLike(Buffer, "le", 1),
      ],
      program.programId
    );

    await program.methods
      .addStamp("Thailand", "Bangkok", "Street food is incredible")
      .accounts({
        config: configPDA,
        passport: passport2PDA,
        stamp: stampPDA,
        traveler: traveler2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([traveler2])
      .rpc();

    const stamp = await program.account.stamp.fetch(stampPDA);
    expect(stamp.country).to.equal("Thailand");
    expect(stamp.city).to.equal("Bangkok");
    expect(stamp.stampIndex).to.equal(0);
  });

  it("Update Config", async () => {
    const newFee = new BN(200_000_000); // 0.2 SOL

    await program.methods
      .updateConfig(newFee, 100, false)
      .accounts({
        config: configPDA,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    const config = await program.account.config.fetch(configPDA);
    expect(Number(config.feeLamports.toString())).to.equal(200_000_000);
    expect(config.maxStamps).to.equal(100);
    expect(config.isPaused).to.be.false;
  });

  it("Deactivate Passport by Authority", async () => {
    await program.methods
      .deactivatePassport()
      .accounts({
        config: configPDA,
        passport: passport2PDA,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    const passport = await program.account.passport.fetch(passport2PDA);
    expect(passport.isActive).to.be.false;
  });

  it("Fail - Add Stamp to Deactivated Passport", async () => {
    const [stampPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stamp"),
        passport2PDA.toBuffer(),
        new BN(1).toArrayLike(Buffer, "le", 1),
      ],
      program.programId
    );

    try {
      await program.methods
        .addStamp("Mexico", "Mexico City", "Should fail")
        .accounts({
          config: configPDA,
          passport: passport2PDA,
          stamp: stampPDA,
          traveler: traveler2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([traveler2])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("inactive");
    }
  });

  it("Fail - Unauthorized Config Update", async () => {
    const fakeAuthority = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        fakeAuthority.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );

    const [fakeConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), fakeAuthority.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .updateConfig(new BN(0), 10, false)
        .accounts({
          config: configPDA,
          authority: fakeAuthority.publicKey,
        })
        .signers([fakeAuthority])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it("Fail - Stamp with invalid long country name", async () => {
    const [stampPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stamp"),
        passport1PDA.toBuffer(),
        new BN(2).toArrayLike(Buffer, "le", 1),
      ],
      program.programId
    );

    try {
      await program.methods
        .addStamp(
          "A".repeat(33),
          "City",
          "Too long country"
        )
        .accounts({
          config: configPDA,
          passport: passport1PDA,
          stamp: stampPDA,
          traveler: traveler1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([traveler1])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
    }
  });
});
