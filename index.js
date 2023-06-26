require('dotenv').config()
const { program } = require("commander");
const { getOrCreateAssociatedTokenAccount } = require('@solana/spl-token');
const { clusterApiUrl, Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { 
  registerDomainName,
  transferNameOwnership,
  NameRegistryState,
  getDomainKey,
  SOL_TLD_AUTHORITY
} = require("@bonfida/spl-name-service")
const bs58 = require("bs58");

program.version("0.0.1")

const SECRET_KEY = process.env.ADMIN_WALLET_PRIVATE_KEY
const wallet = Keypair.fromSecretKey(bs58.decode(SECRET_KEY));
const usdc_contract_address = new PublicKey(process.env.USDC_CONTRACT_ADDRESS)
const connection = new Connection(
  clusterApiUrl(process.env.CLUSTER),
  'confirmed'
);

const domainLookup = async (domain_sol) => {
  try {
    const { pubkey } = await getDomainKey(domain_sol);
    // Step 2
    // The registry object contains all the info about the domain name
    // The NFT owner is of type PublicKey | undefined
    const { registry, nftOwner } = await NameRegistryState.retrieve(
      connection,
      pubkey
    );
    console.log(registry)
  } catch(e) {
    console.log(e.message)
  }
}

const registerSOLDomain = async (domain_sol) => {
  try {
    const space = 1 * 1_000; // We want a 1kB sized domain (max 10kB)
    const buyer = wallet.publicKey; // Publickey of the buyer
    const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      usdc_contract_address,
      wallet.publicKey
    )
    console.log(buyer.toBase58())
    console.log(buyerTokenAccount.address.toBase58())
    const [, ix] = await registerDomainName(
      connection,
      domain_sol,
      space,
      buyer,
      buyerTokenAccount.address
    );
    console.log(ix)
    return true
  } catch(e) {
    console.log(e.message)
    return false
  }
}

const transferSOLDomain = async (domain_sol, phantomWalletDestinatiob) => {
  try {
    // New owner of the domain
    const newOwner = new PublicKey(phantomWalletDestinatiob);

    const ix = await transferNameOwnership(
      connection,
      domain_sol,
      newOwner,
      undefined,
      SOL_TLD_AUTHORITY
    );
    console.log(ix)
    return true;
  } catch(e) {
    console.log(e.message)
    return false;
  }
}

program.command("lookup_domain")
.requiredOption("-n, --name <string>", "domain name")
.action(async (directory, cmd) => {
    const { name } = cmd.opts();
    domainLookup(name)
});

program.command("register_domain")
.requiredOption("-n, --name <string>", "domain name")
.action(async (directory, cmd) => {
    const { name } = cmd.opts();
    registerSOLDomain(name)
});

program.command("transfer_domain")
.requiredOption("-n, --name <string>", "domain name")
.requiredOption("-d, --destination <string>", "destinamtion address")
.action(async (directory, cmd) => {
    const { name, destination } = cmd.opts();
    transferSOLDomain(name, destination)
});

program.parse(process.argv);
