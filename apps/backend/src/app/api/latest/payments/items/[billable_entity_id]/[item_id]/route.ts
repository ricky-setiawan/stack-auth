import { iteratePaginatedFlowglad } from "@/lib/flowglad";
import { createSmartRouteHandler } from "@/route-handlers/smart-route-handler";
import { adaptSchema, serverOrHigherAuthTypeSchema, yupNumber, yupObject, yupString } from "@stackframe/stack-shared/dist/schema-fields";
import { StatusError, throwErr } from "@stackframe/stack-shared/dist/utils/errors";
import { paymentsConfigPerProject } from "../../../config";

export const GET = createSmartRouteHandler({
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
      item_id: yupString().defined(),
    }),
  }),
  response: yupObject({
    statusCode: yupNumber().oneOf([200]).defined(),
    bodyType: yupString().oneOf(["json"]).defined(),
    body: yupObject({
      id: yupString().defined(),
      name: yupString().defined(),
      quantity: yupNumber().defined(),
    }).defined(),
  }),
  handler: async (req) => {
    const { project, tenancy } = req.auth!;

    const paymentsConfig = paymentsConfigPerProject.get(project.id);
    if (!paymentsConfig) {
      throw new StatusError(400, "Payments not enabled for this project. Please contact Stack Auth to enable it.");
    }

    const itemConfig = paymentsConfig.itemConfigs.get(req.params.item_id);
    if (!itemConfig) {
      throw new StatusError(404, "Item ID not found.");
    }

    // TODO check whether the user is allowed to view items for this entity if on client

    const subscriptions = await iteratePaginatedFlowglad(paymentsConfig.flowglad.subscriptions, "list")();
    console.log("subscriptions", subscriptions);

    // TODO this should maybe be faster instead of iterating over every single subscription (including those from other users)
    let totalQuantity = 0;
    for (const subscription of subscriptions) {
      if (subscription.current) {
        const pricingModelConfig = paymentsConfig.pricingModelConfigs.get(subscription.metadata?.pricingModelId as any ?? throwErr(`Pricing model ID not found in subscription metadata: ${subscription.id}`));
        if (!pricingModelConfig) {
          // pricing model has been deleted
          continue;
        }
        for (const { itemConfigId, quantity } of pricingModelConfig.items) {
          if (itemConfigId === req.params.item_id) {
            totalQuantity += quantity;
          }
        }
      }
    }


    return {
      statusCode: 200,
      bodyType: "json",
      body: {
        id: req.params.item_id,
        name: itemConfig.name,
        quantity: totalQuantity,
      },
    };
  },
});
