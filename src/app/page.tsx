"use client";
import { useState } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { getChain } from "@heima-network/chaindata";
import { createIdentityType, request } from "@heima-network/client-sdk";
import { TypeRegistry } from "@polkadot/types";
import { identity } from "@heima-network/parachain-api";

export default function Home() {
    const [email, setEmail] = useState("");

    const excute = async () => {
        await cryptoWaitReady();
        const registry = new TypeRegistry();
        registry.register(identity.types);
        const api = new ApiPromise({
            provider: new WsProvider(getChain("heima-dev").rpcs[0].url),
            registry,
        });
        console.log(getChain("heima-dev").rpcs[0].url, "url");
        await api.isReady;
        const member = createIdentityType(api.registry, {
            addressOrHandle: email,
            type: "Email",
        });
        console.log(member.toHuman(), "member");

        const result = await request.requestEmailVerificationCode(
            {
                email: email,
            },
            // true,
        );
    };

    return (
        <div>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
            />
            <button onClick={excute}>Click me</button>
        </div>
    );
}
