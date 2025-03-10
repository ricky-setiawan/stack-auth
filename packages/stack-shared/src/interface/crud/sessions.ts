import { CrudTypeOf, createCrud } from "../../crud";
import { yupBoolean, yupMixed, yupNumber, yupObject, yupString } from "../../schema-fields";

export const sessionsCrudServerCreateSchema = yupObject({
  user_id: yupString().uuid().defined(),
  expires_in_millis: yupNumber().max(1000 * 60 * 60 * 24 * 367).default(1000 * 60 * 60 * 24 * 365),
  is_impersonation: yupBoolean().default(false),
}).defined();

export const sessionsCrudServerDeleteSchema = yupMixed();

export const sessionsCrud = createCrud({
  serverCreateSchema: sessionsCrudServerCreateSchema,
  serverDeleteSchema: sessionsCrudServerDeleteSchema,
  docs: {
    serverCreate: {
      summary: "Create session",
      description: "Create a new session for a given user. This will return a refresh token that can be used to impersonate the user.",
      tags: ["Sessions"],
    },
    serverList: {
      summary: "List sessions",
      description: "List all sessions for the current user.",
      tags: ["Sessions"],
    },
    serverDelete: {
      summary: "Delete session",
      description: "Delete a session by ID.",
      tags: ["Sessions"],
    },
  },
});
export type SessionsCrud = CrudTypeOf<typeof sessionsCrud>;
