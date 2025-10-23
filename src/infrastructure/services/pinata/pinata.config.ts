import { PinataSDK } from "pinata";
import { env } from "@/shared/config/env";

/**
 * Pinata SDK Configuration
 */
export const pinata = new PinataSDK({
  pinataJwt: env.PINATA_JWT,
  pinataGateway: env.PINATA_GATEWAY_URL,
});
