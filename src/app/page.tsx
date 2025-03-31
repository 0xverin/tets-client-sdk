"use client";
import { useState } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { getChain } from "@heima-network/chaindata";
import { createIdentityType, request, getAndWaitForAccountStoreCreation, toHash } from "@heima-network/client-sdk";
import { TypeRegistry } from "@polkadot/types";
import { identity, omniAccount, omniExecutor, sidechain } from "@heima-network/parachain-api";


const types = {
    ...identity.types, // Identity is defined here
    ...omniAccount.types, // OmniAccountPermission is defined here
    ...omniExecutor.types, // NativeCall is defined here
    ...sidechain.types, // AesOutput is defined here
};
export default function Home() {
    const [email, setEmail] = useState("");
    const [verificationCode, setVerificationCode] = useState("");

  
  // step1
    const requestEmailVerificationCode = async () => {
        await cryptoWaitReady();
        const api = new ApiPromise({
            provider: new WsProvider(getChain("heima-dev").rpcs[0].url),
            types,
        });
        await api.isReady;
        // Assuming there's a method to request the email verification code
        const result = await request.requestEmailVerificationCode({ email });
        console.log(result);
    };
  
  // step2
  const createAccountStore = async () => {
       await cryptoWaitReady();
       const api = new ApiPromise({
           provider: new WsProvider(getChain("heima-dev").rpcs[0].url),
           types,
       });
    await api.isReady;
       const member = createIdentityType(api.registry, {
           addressOrHandle: email,
           type: "Email",
       });
    
    const { send } = await request.createAccountStore(api, { member });
    console.log(verificationCode, email);
       const result = await send({ authentication: { type: "Email", verificationCode } });
       console.log(result);
    
  };
  
  // step3
    const requestAuthToken = async () => {
        await cryptoWaitReady();
        const api = new ApiPromise({
            provider: new WsProvider(getChain("heima-dev").rpcs[0].url),
            types,
        });
      await api.isReady;
      
        const member = createIdentityType(api.registry, {
            addressOrHandle: email,
            type: "Email",
        });
        const { send } = await request.requestAuthToken(api, { member });
        const result = await send({ authentication: { type: "Email", verificationCode } });
        console.log(result);
    };
  
  
  const checkAccountStore = async () => {
    await cryptoWaitReady();
    const api = new ApiPromise({
        provider: new WsProvider(getChain("heima-dev").rpcs[0].url),
        types,
    });
     const member = createIdentityType(api.registry, {
         addressOrHandle: email,
         type: "Email",
     });
    const omniAccount = toHash(member);

    const accountStore = await getAndWaitForAccountStoreCreation(api, omniAccount);
    if (!accountStore) {
        throw new Error("Account store not found");
    }
    console.log(accountStore.toString());

  };
  

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
                <button onClick={requestEmailVerificationCode}>Request Verification Code</button>
            </div>
            <div>
                <button onClick={createAccountStore}>Create Account Store</button>
            </div>
            <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter your verification code"
            />
            <button onClick={requestAuthToken}>Request Auth Token</button>
            <div>
                <button onClick={checkAccountStore}>Check Account Store</button>
            </div>
        </div>
    </div>
);
}
