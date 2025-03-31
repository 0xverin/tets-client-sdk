"use client";
import { useState } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { getChain } from "@heima-network/chaindata";
import { createIdentityType, request } from "@heima-network/client-sdk";
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
  
  
  const createAccountStore = async () => {
       await cryptoWaitReady();
       const api = new ApiPromise({
           provider: new WsProvider(getChain("heima-dev").rpcs[0].url),
           types,
       });
    await api.isReady;
    await request.requestEmailVerificationCode({ email });
       const member = createIdentityType(api.registry, {
           addressOrHandle: email,
           type: "Email",
       });
    
       const { send } = await request.createAccountStore(api, { member });
       const result = await send({ authentication: { type: "Email", verificationCode } });
       console.log(result);
    
  };
  

    const requestAuthToken = async () => {
        await cryptoWaitReady();
        const api = new ApiPromise({
            provider: new WsProvider(getChain("heima-dev").rpcs[0].url),
            types,
        });
      await api.isReady;
      
    await request.requestEmailVerificationCode({ email });

        const member = createIdentityType(api.registry, {
            addressOrHandle: email,
            type: "Email",
        });
        const { send } = await request.createAccountStore(api, { member });
        const result = await send({ authentication: { type: "Email", verificationCode } });
        console.log(result);
    };

    return (
        <div>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
            />
        <button onClick={requestEmailVerificationCode}>Request Verification Code</button>
        <button onClick={createAccountStore}>Create Account Store</button>

            <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter your verification code"
            />
            <button onClick={requestAuthToken}>Request Auth Token</button>
        </div>
    );
}
