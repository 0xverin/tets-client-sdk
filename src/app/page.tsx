"use client";
import { useState } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { createIdentityType, request, Enclave, JsonRpcRequest } from "@heima-network/client-sdk";
import { TypeRegistry } from "@polkadot/types";
import { identity, omniAccount, omniExecutor, sidechain } from "@heima-network/parachain-api";
import { type ChainId, getChain } from "@heima-network/chaindata";
import { assert, isHex, u8aToHex, u8aToString, u8aToU8a } from "@polkadot/util";
import { compactStripLength, hexToU8a } from "@polkadot/util";
import { base64Encode, base64Trim } from "@polkadot/util-crypto";
import type { U8aLike } from "@polkadot/util/types";
import crypto from "crypto";
import { KeyObject } from "crypto";
import type { Bytes } from "@polkadot/types-codec";
import { createPublicKey } from "crypto";
import type { Registry } from "@polkadot/types-codec/types";
import type { AesOutput } from "@heima-network/parachain-api";
import type { HexString } from "@polkadot/util/types";

   const ciphertextRes = {
       ciphertext: "0x377c6669c603c42f077bbbfa76f013d307c63c0d9fccaf13cce154d8f5257bf9aa099be19d36c58f882d6798579d278c",
       aad: "0x",
       nonce: "0xd471040f810e5d382bfc8ce9",
   };
   const randomAes = "0x9635e81da12daec72a72ecd9bf452458c686a0240024389c033afb7a12c5528b";
   const aesKeyGenParams: AesKeyGenParams = {
       name: "AES-GCM",
       length: 256,
   };
const aesKeyUsages: KeyUsage[] = ["encrypt", "decrypt"];


async function generateKey(): Promise<CryptoKey> {
    const key = await globalThis.crypto.subtle.generateKey(aesKeyGenParams, true, aesKeyUsages);

    return key;
}
 function u8aToBase64Url(value: U8aLike): string {
     return (
         // Remove padding (`=`) from base64
         base64Trim(base64Encode(value))
             // Replace `+` with `-`
             .replace(/\+/g, "-")
             // Replace `/` with `_`
             .replace(/\//g, "_")
     );
 }

 function encryptBuffer(pubKey: crypto.KeyLike, plaintext: Uint8Array): Buffer {
     const bs = 384; // 3072 bits = 384 bytes
     const bsPlain = bs - (2 * 256) / 8 - 2; // Maximum plaintext block size
     const count = Math.ceil(plaintext.length / bsPlain); // Use Math.ceil to ensure proper chunk count

     const cipherText = Buffer.alloc(bs * count);

     for (let i = 0; i < count; i++) {
         const plainSlice = plaintext.slice(i * bsPlain, Math.min((i + 1) * bsPlain, plaintext.length));
         const cipherSlice = crypto.publicEncrypt(
             {
                 key: pubKey,
                 padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                 oaepHash: "sha256",
             },
             plainSlice,
         );

         cipherSlice.copy(cipherText, i * bs);
     }

     return cipherText;
 }
 export function encryptWithTeeShieldingKey(teeShieldingKey: KeyObject, plaintext: Uint8Array): Buffer {
     return encryptBuffer(teeShieldingKey, plaintext);
 }
  function decodeRpcBytesAsString(value: Bytes): string {
      return u8aToString(compactStripLength(hexToU8a(value.toHex()))[1]);
  }

const types = {
    ...identity.types, // Identity is defined here
    ...omniAccount.types, // OmniAccountPermission is defined here
    ...omniExecutor.types, // NativeCall is defined here
    ...sidechain.types, // AesOutput is defined here
};
export default function Home() {
    const [email, setEmail] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [googleCode, setGoogleCode] = useState("");

    const requestEmailVerificationCodeWithRpc=async() => {
        const wsClient = Enclave.getInstance();
          const rpcRequest = {
              jsonrpc: "2.0",
              method: "omni_requestEmailVerificationCode",
              params: {
                  user_email: email
              },
          };
        
        const response = await wsClient.send(rpcRequest as any);
        console.log(response);
    }

    const requestPumpJwtWithRpc=async() => {
        const wsClient = Enclave.getInstance();
          const rpcRequest = {
              jsonrpc: "2.0",
              method: "pumpx_requestJwt",
              params: {
                  user_email: email,
                  invite_code: "", // Optional
                  google_code: "", // Optional
                  language: "", // Optional
                  email_code: verificationCode,
              },
          };
        
        const response = await wsClient.send(rpcRequest as any);
        console.log(response);
    }
  const encrypt = async ({ cleartext }: { cleartext: Uint8Array }): Promise<{ ciphertext: Uint8Array }> => {
      const key = await getShieldingKey();

      const encrypted = await globalThis.crypto.subtle.encrypt(
          {
              name: "RSA-OAEP",
          },
          key,
          cleartext,
      );

      return { ciphertext: new Uint8Array(encrypted) };
  };
  
    const exportWallet = async () => {
        const aesRandomKey = globalThis.crypto.getRandomValues(new Uint8Array(32));
        console.log("aesRandomKey", u8aToHex(aesRandomKey));
        const wsClient = Enclave.getInstance();
        const encryptedKey = await encrypt({ cleartext: aesRandomKey });
        console.log(encryptedKey);

        const rpcRequest = {
            jsonrpc: "2.0",
            method: "pumpx_exportWallet",
            params: {
                user_email: email,
                key: u8aToHex(encryptedKey.ciphertext),
                chain_id: 1,
                wallet_index: 5,
                wallet_address: "0xDA65A2AAB3765D7DCea61387fd2aEc9d57E9458E",
                email_code: verificationCode,
                google_code: googleCode,
            },
        };

        const response = await wsClient.send(rpcRequest as any);
        console.log(response);
    }

    const getShieldingKey = async () => {
        
        const wsClient = Enclave.getInstance();
        const res:any = await wsClient.send({
            jsonrpc: "2.0",
            method: "omni_getShieldingKey",
            params: [],
        });

        // ```
        // {
        //     "e": "010001",
        //     "n": "0bcd156a8bcbb8895c4e1bd8891e60d178bd0833304276071889c8ceb10499fba5666a9dd40682d883d27bf6ee0f09979e5b2eac52ac803fcaef50f91425ca27347c1ed5a46821c340309e9f00751a2466fa5995cba3d817b237301cbbe95c9f97d2bade6ea0e7d44930fc737de1fc499673e781968f39c79294a97df9f0eed7a6ef05de44d34515d89da6b65b68f5429885b7198e3f715bc797cc45fc125bef530331c6f757d0220fa308c9b5d13b79e0fcd650a4aec8949e3d3e1517363adf73d8a3da17ef0c47982787f56aff1d91084eaae63d4e2c3cd0c51a6f73c842176eb4857e65457def0b958626ff17e24636d31d34beeeb89e38dfbc9e5ff10f7819075a11f860b933d56ebee7949c870fe5b9307ef94b9d9b343b082d16c63b8223276f948cac05f68110b2f57ed34a5897ad1a48fd34715939b3a4ff187ee887ff7e16ba11e901e39a0628d3c41ecc076d2ff30a001a9fcd885be6142d027ba2ec4463acf9a12b5f3209044a97d0e9b71e5c1346feb143ab270c6077a4b99dac"
        // }
        // ```
        const pubKeyJSON = res;

        const jwkData = {
            alg: "RSA-OAEP-256",
            kty: "RSA",
            use: "enc",
            n: u8aToBase64Url(new Uint8Array([...hexToU8a(pubKeyJSON.n)].reverse())),
            e: u8aToBase64Url(new Uint8Array([...hexToU8a(pubKeyJSON.e)].reverse())),
        };
        const shieldingKey = await globalThis.crypto.subtle.importKey(
              "jwk",
              jwkData,
              {
                  name: "RSA-OAEP",
                  hash: "SHA-256",
              },
              false,
              ["encrypt"],
        );
        console.log("shieldingKey", shieldingKey);
        return shieldingKey;
    }

 async function decryptWithAes(key: HexString, aesOutput: AesOutput, type: "hex" | "utf-8"): Promise<HexString> {
     const secretKey = await globalThis.crypto.subtle.importKey(
         "raw",
         hexToU8a(key),
         { name: "AES-GCM" },
         false,
         ["decrypt"]
     );
     const tagSize = 16;
     
     // Ensure ciphertext is a Uint8Array
     const ciphertextBytes = aesOutput.ciphertext ? 
         (aesOutput.ciphertext instanceof Uint8Array ? 
             aesOutput.ciphertext : 
             hexToU8a(aesOutput.ciphertext)
         ) : 
         hexToU8a("0x");
     
     // Ensure nonce and aad are Uint8Arrays
     const nonceBytes = aesOutput.nonce ? 
         (aesOutput.nonce instanceof Uint8Array ? 
             aesOutput.nonce : 
             hexToU8a(aesOutput.nonce)
         ) : 
         hexToU8a("0x");
     
     const aadBytes = aesOutput.aad ? 
         (aesOutput.aad instanceof Uint8Array ? 
             aesOutput.aad : 
             hexToU8a(aesOutput.aad)
         ) : 
         hexToU8a("0x");
     
     // Extract auth tag from ciphertext (last 16 bytes)
     const authorTag = ciphertextBytes.subarray(ciphertextBytes.length - tagSize);
     const actualCiphertext = ciphertextBytes.subarray(0, ciphertextBytes.length - tagSize);
     
     try {
         // Decrypt the data
         const decryptedArrayBuffer = await globalThis.crypto.subtle.decrypt(
             {
                 name: "AES-GCM",
                 iv: nonceBytes,
                 additionalData: aadBytes,
                 tagLength: tagSize * 8,
             }, 
             secretKey, 
             new Uint8Array([...actualCiphertext, ...authorTag])
         );
         
         // Convert the result based on the requested type
         const decryptedBytes = new Uint8Array(decryptedArrayBuffer);
         if (type === "hex") {
             return `0x${u8aToHex(decryptedBytes).substring(2)}`;
         } else {
             return `0x${u8aToString(decryptedBytes)}`;
         }
     } catch (error) {
         console.error("Decryption error:", error);
         throw new Error("Failed to decrypt data");
     }
 }
return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
            <div>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                />
                <button onClick={requestEmailVerificationCodeWithRpc}>Request Verification Code</button>
            </div>
            <div>
                <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter verification code"
                />
                <button onClick={requestPumpJwtWithRpc}>Request Pumpx JWT</button>
            </div>
            <div>
                <input
                    type="text"
                    value={googleCode}
                    onChange={(e) => setGoogleCode(e.target.value)}
                    placeholder="Enter Google code"
                />
            </div>
            <div>
                <button onClick={exportWallet}>Export Wallet</button>
                <button onClick={async () => {
                    try {
                        const res = await decryptWithAes(randomAes, ciphertextRes as unknown as AesOutput, "hex");
                        console.log("Decrypted result:", res);
                    } catch (error) {
                        console.error("Error in decryption:", error);
                    }
                }}>Decrypt</button>

                {/* <button onClick={getShieldingKey}>Get Shielding Key</button> */}
            </div>
        </div>
    </div>
);
}
