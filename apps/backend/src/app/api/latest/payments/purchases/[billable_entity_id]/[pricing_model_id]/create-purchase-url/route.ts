import { createSmartRouteHandler } from "@/route-handlers/smart-route-handler";
import { adaptSchema, serverOrHigherAuthTypeSchema, yupNumber, yupObject, yupString } from "@stackframe/stack-shared/dist/schema-fields";
import { StatusError, throwErr } from "@stackframe/stack-shared/dist/utils/errors";
import { paymentsConfigPerProject } from "../../../../config";

export const POST = createSmartRouteHandler({
  metadata: {
    hidden: true,
  },
  request: yupObject({
    auth: yupObject({
      type: serverOrHigherAuthTypeSchema.defined(),
      project: adaptSchema.defined(),
      tenancy: adaptSchema.defined(),
    }).nullable(),
    params: yupObject({
      billable_entity_id: yupString().defined(),
      pricing_model_id: yupString().defined(),
    }),
  }),
  response: yupObject({
    statusCode: yupNumber().oneOf([200]).defined(),
    bodyType: yupString().oneOf(["json"]).defined(),
    body: yupObject({
      url: yupString().defined(),
    }).defined(),
  }),
  handler: async (req) => {
    const { project, tenancy } = req.auth!;

    const paymentsConfig = paymentsConfigPerProject.get(project.id);
    if (!paymentsConfig) {
      throw new StatusError(400, "Payments not enabled for this project. Please contact Stack Auth to enable it.");
    }

    const pricingModelConfig = paymentsConfig.pricingModelConfigs.get(req.params.pricing_model_id);
    if (!pricingModelConfig) {
      throw new StatusError(404, "Pricing model not found.");
    }

    // TODO check whether the user is allowed to purchase things for this entity if on client

    const { catalog } = await paymentsConfig.flowglad.catalogs.retrieveDefault();

    const { product } = await paymentsConfig.flowglad.products.create({
      product: {
        catalogId: catalog.id,
        active: true,
        name: pricingModelConfig.name,
        description: "A Stack Auth product.",
        displayFeatures: [],
        imageURL: null,
        pluralQuantityLabel: pricingModelConfig.name + "[TODO:plural]",
        singularQuantityLabel: pricingModelConfig.name + "[TODO:singular]",
      },
      price: {
        active: true,
        isDefault: true,
        name: "Default",
        productId: "PLACEHOLDER_VALUE", // TODO remove it once Flowglad fixes this
        intervalCount: 1,
        intervalUnit: "month",
        unitPrice: pricingModelConfig.priceUsd,
        type: "subscription",
        usageMeterId: null,
        setupFeeAmount: 0,
        trialPeriodDays: 0,
      },
    });

    //const prices = await iteratePaginatedFlowglad(paymentsConfig.flowglad.prices.list)();
    const prices = (await paymentsConfig.flowglad.catalogs.retrieve(catalog.id)).catalog.products.find((p) => p.id === product.id)?.prices ?? throwErr("Price not found");
    const price = prices.find((p) => p.productId === product.id) ?? throwErr("Price not found");

    const customer = await paymentsConfig.flowglad.customers.create({
      customer: {
        email: "test@test.com",
        name: "Test Customer",
        externalId: req.params.billable_entity_id,
      },
    });

    const { url } = await paymentsConfig.flowglad.checkoutSessions.create({
      checkoutSession: {
        priceId: price.id,
        successUrl: "https://www.example.com",
        cancelUrl: "https://cancel.example.com",
        customerExternalId: req.params.billable_entity_id,
        outputMetadata: {
          billableEntityId: req.params.billable_entity_id,
          tenancyId: tenancy.id,
          pricingModelId: req.params.pricing_model_id,
        },
      },
    });


    return {
      statusCode: 200,
      bodyType: "json",
      body: {
        url,
      },
    };
  },
});
