"use client";
import { useState } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import {
    createIdentityType,
    request,
    Enclave,
    JsonRpcRequest,
    decryptWithAes,
} from "@heima-network/client-sdk";
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
import {blake2AsHex} from "@polkadot/util-crypto";

//    const ciphertextRes = {
//        ciphertext: "0x1f7dde5143ccf34ac1756dcbd1cb7563408e5750c6758dba58ca383e723f47a1b2d774170b690229c01d7d9d9a1b2780",
//        aad: "0x",
//        nonce: "0xcc6e4b8b9b50bc990dcb016e",
//    };
//    const randomAes = "0x3aefe1ec780dc389ed4e048eacaf25679a7f2e567d11f65071b51029dd63e79d";
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
    const [walletAddress, setWalletAddress] = useState("");
    const [walletIndex, setWalletIndex] = useState(0);
    const aesRandomKey = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const [identity, setIdentity] = useState("");
    const [userId, setUserId] = useState("");

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


    const exportWallet = async () => {
        console.log("aesRandomKey", u8aToHex(aesRandomKey));
        const enclave = new Enclave("wss://enclave-staging.heima.network");
        const encryptedKey = await enclave.encrypt({ cleartext: aesRandomKey });
        console.log("encryptedKey", u8aToHex(encryptedKey.ciphertext));

        const rpcRequest = {
            jsonrpc: "2.0",
            method: "pumpx_exportWallet",
            params: {
                user_email: email,
                key: u8aToHex(encryptedKey.ciphertext),
                chain_id: 56,
                wallet_index: walletIndex,
                wallet_address: walletAddress,
                email_code: verificationCode,
                google_code: googleCode,
                user_id: userId,
            },
        };
        const response = await enclave.send(rpcRequest as any);
        console.log("response", response);

        // const response = await enclave.send(rpcRequest as any);
        // {
        //     //        ciphertext: "0xb0b6126dd7acae085cd4da94185d0707bb19257f6f95cac84c2c4b0ffc0e23995ac656c96f08abd007b32bafae5477f7",
        //     //        aad: "0x",
        //     //        nonce: "0xaad559c090dc5195ace3e3eb",
        //     //    };
        //     console.log(222222, u8aToHex(aesRandomKey));
            const decryptedKey = await decryptWithAes(u8aToHex(aesRandomKey), response as unknown as AesOutput, "hex");
            console.log("decryptedKey", decryptedKey);
        // }
    }

    const createIdentity = async () => {
        const registry = new TypeRegistry();
        registry.register(types);
        const res = createIdentityType(registry, {
            addressOrHandle: email,
            type: "Email",
        });
        console.log(blake2AsHex(res.toU8a()));
        console.log(u8aToHex(res.hash));
        setIdentity(u8aToHex(res.hash));
    }
return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
            <div>
                <label htmlFor="email" style={{ display: "block", marginBottom: "5px", textAlign: "left" }}>
                    Email:
                </label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                />
                <div>
                    <label htmlFor="userId" style={{ display: "block", marginBottom: "5px", textAlign: "left" }}>
                        User ID:
                    </label>
                    <input
                        id="userId"
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="Enter user id"
                    />
                </div>
                <div>
                    <label htmlFor="googleCode" style={{ display: "block", marginBottom: "5px", textAlign: "left" }}>
                        Google Code:
                    </label>
                    <input
                        id="googleCode"
                        type="text"
                        value={googleCode}
                        onChange={(e) => setGoogleCode(e.target.value)}
                        placeholder="Enter Google code"
                    />
                </div>
                <div>
                    <label htmlFor="walletAddress" style={{ display: "block", marginBottom: "5px", textAlign: "left" }}>
                        Wallet Address:
                    </label>
                    <input
                        id="walletAddress"
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="Enter wallet address"
                    />
                </div>
                <div>
                    <label
                        htmlFor="verificationCode"
                        style={{ display: "block", marginBottom: "5px", textAlign: "left" }}
                    >
                        Verification Code:
                    </label>
                    <input
                        id="verificationCode"
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="Enter verification code"
                    />
                </div>
                <div>
                    <label htmlFor="walletIndex" style={{ display: "block", marginBottom: "5px", textAlign: "left" }}>
                        Wallet Index:
                    </label>
                    <input
                        id="walletIndex"
                        type="text"
                        value={walletIndex}
                        onChange={(e) => setWalletIndex(parseInt(e.target.value))}
                        placeholder="Enter wallet index"
                    />
                </div>
            </div>
            {/* <div>
                <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="Enter wallet address"
                />
            </div>
            <div>
                <input
                    type="text"
                    value={walletIndex}
                    onChange={(e) => setWalletIndex(parseInt(e.target.value))}
                    placeholder="Enter wallet index"
                />
            </div> */}
            {/* <div>
                <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter verification code"
                />
            </div>
            <div>
                <input
                    type="text"
                    value={googleCode}
                    onChange={(e) => setGoogleCode(e.target.value)}
                    placeholder="Enter Google code"
                />
            </div> */}
            <div>
                <button onClick={exportWallet}>Export Wallet</button>
            </div>
            <div>
                <button onClick={createIdentity}>Create omni account</button>
            </div>
            <div>{identity}</div>
        </div>
    </div>
);
}
