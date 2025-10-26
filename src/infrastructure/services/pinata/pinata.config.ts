import { PinataSDK } from "pinata";
import { env } from "@/shared/config/env";
import { createLazyInitializer } from "@/shared/lib/utils/lazy-init";

/**
 * Lazy-initialized Pinata SDK
 * Defers instantiation until first access to prevent build-time errors
 */
const getPinata = createLazyInitializer(() => {
  const jwt = env.PINATA_JWT;
  const gateway = env.PINATA_GATEWAY_URL;

  if (!jwt || !gateway) {
    throw new Error(
      "Pinata configuration missing. Ensure PINATA_JWT and PINATA_GATEWAY_URL are set."
    );
  }

  return new PinataSDK({
    pinataJwt: jwt,
    pinataGateway: gateway,
  });
});

/**
 * Export Pinata SDK instance with lazy initialization
 * Safe for both build-time imports and runtime usage
 */
export const pinata = new Proxy({} as PinataSDK, {
  get: (_, prop) => {
    const instance = getPinata();
    const value = instance[prop as keyof PinataSDK];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
