import { Mnemonic } from 'ox'
import {privateKeyToAccount} from "viem/accounts";
import {bytesToHex, Hex} from "viem";

const generateAccount = () => {
    // const mnemonic = Mnemonic.random(Mnemonic.english)
    const mnemonic = 'kite shop now clown liar agent profit ahead tone nominee hotel naive'
    const privateKey = Mnemonic.toPrivateKey(mnemonic)
    const seed = Mnemonic.toSeed(mnemonic)

const pk = privateKey.toString() as Hex;
    console.log('pk', privateKey.toString())

    const account = privateKeyToAccount(pk)
    const address = account.address
    console.log({ mnemonic, privateKey, seed, address, pk })
}

generateAccount()
