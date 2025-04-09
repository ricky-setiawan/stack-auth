import { Flowglad } from '@flowglad/node';
import { getEnvVariable } from "@stackframe/stack-shared/dist/utils/env";

type PaymentsEnvVarJson = {
  flowgladApiKeys: {
    secret: string,
    publishable: string,
  },
  pricingModelConfigs: {
    [id: string]: {
      name: string,
      items: {
        itemConfigId: string,
        quantity: number,
      }[],
      priceUsd: number,
    },
  },
  itemConfigs: {
    [id: string]: {
      name: string,
    },
  },
};

export const paymentsConfigPerProject = new Map(
  Object.entries(JSON.parse(getEnvVariable("STACK_PRERELEASE_FEATURE_PAYMENTS_ENABLED_PROJECTS")))
    .map(j => j as [string, PaymentsEnvVarJson])
    .map(([k, v]) => [
      k,
      {
        flowglad: new Flowglad({
          apiKey: v.flowgladApiKeys.secret,
          baseURL: "https://app.flowglad.com",
          logLevel: "debug",
        }),
        pricingModelConfigs: new Map(Object.entries(v.pricingModelConfigs)),
        itemConfigs: new Map(Object.entries(v.itemConfigs)),
      },
    ])
);
