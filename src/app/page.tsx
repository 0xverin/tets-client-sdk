"use client";
import { useState } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { createIdentityType, request, Enclave, JsonRpcRequest } from "@heima-network/client-sdk";
import { TypeRegistry } from "@polkadot/types";
import { identity, omniAccount, omniExecutor, sidechain } from "@heima-network/parachain-api";
import { type ChainId, getChain } from "@heima-network/chaindata";



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
              params: [email],
          };
        
        const response = await wsClient.send(rpcRequest);
        console.log(response);
    }

    const requestPumpJwtWithRpc=async() => {
        const wsClient = Enclave.getInstance();
          const rpcRequest: JsonRpcRequest = {
              jsonrpc: "2.0",
              method: "pumpx_requestJwt",
              params: [email, "", "", "", verificationCode],
          };
        
        const response = await wsClient.send(rpcRequest);
        console.log(response);
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
        </div>
    </div>
);
}
