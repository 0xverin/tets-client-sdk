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
        console.log(aesRandomKey);
        const wsClient = Enclave.getInstance();
        const encryptedKey = await encrypt({ cleartext: aesRandomKey });
        console.log(encryptedKey);

        const rpcRequest = {
            jsonrpc: "2.0",
            method: "pumpx_exportWallet",
            params: {
                user_email: email,
                key: u8aToHex(encryptedKey.ciphertext),
                google_code: "",
                chain_id: 1,
                wallet_index: 1,
                wallet_address: "0x3Bc9c5e4D7e934f0d66D2195E4569Da13709A079",
                email_code: verificationCode,
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
                <button onClick={exportWallet}>Export Wallet</button>
            </div>
            <div>
                <button onClick={getShieldingKey}>Get Shielding Key</button>
            </div>   
        </div>
    </div>
);
}
