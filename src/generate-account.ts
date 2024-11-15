import { Mnemonic } from 'ox';
import { type Hex, bytesToHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const generateAccount = () => {
  // const mnemonic = Mnemonic.random(Mnemonic.english)
  // Hardcoded Test mnemonic
  const mnemonic =
    'kite shop now clown liar agent profit ahead tone nominee hotel naive';
  const privateKey = Mnemonic.toPrivateKey(mnemonic);
  const seed = Mnemonic.toSeed(mnemonic);

  const pk = privateKey.toString() as Hex;
  console.log('pk', privateKey.toString());

  const account = privateKeyToAccount(pk);
  const address = account.address;
  console.log({ mnemonic, privateKey, seed, address, pk });
};

generateAccount();
