import { urlString } from "@stackframe/stack-shared/dist/utils/urls";
import { it } from "../../../../../../helpers";
import { Auth, niceBackendFetch } from "../../../../../backend-helpers";

it("can create purchase URLs", async ({ expect }: { expect: any }) => {
  const { userId } = await Auth.Otp.signIn();

  const response = await niceBackendFetch(urlString`/api/v1/payments/purchases/${userId}/sub/create-purchase-url`, {
    method: "POST",
    accessType: "server",
  });

  const response2 = await niceBackendFetch(urlString`/api/v1/payments/items/${userId}/credit`, {
    method: "GET",
    accessType: "server",
  });

  expect([response, response2]).toMatchInlineSnapshot(`
    [
      NiceResponse {
        "status": 200,
        "body": { "url": "https://app.flowglad.com/checkout/chckt_session_zRqXqE6GTeJ4b2VeM4l4o" },
        "headers": Headers { <some fields may have been hidden> },
      },
      NiceResponse {
        "status": 200,
        "body": {
          "id": "credit",
          "name": "Credit",
          "quantity": 0,
        },
        "headers": Headers { <some fields may have been hidden> },
      },
    ]
  `);
});
