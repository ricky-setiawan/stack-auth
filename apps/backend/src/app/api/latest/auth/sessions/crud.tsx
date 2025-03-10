import { prismaClient } from "@/prisma-client";
import { createAuthTokens } from "@/lib/tokens";
import { createCrudHandlers, CrudHandlerInvocationError } from "@/route-handlers/crud-handler";
import { sessionsCrud } from "@stackframe/stack-shared/dist/interface/crud/sessions";
import { userIdOrMeSchema, yupObject, yupString } from "@stackframe/stack-shared/dist/schema-fields";
import { StatusError, throwErr } from "@stackframe/stack-shared/dist/utils/errors";
import { createLazyProxy } from "@stackframe/stack-shared/dist/utils/proxies";
import { KnownErrors } from "@stackframe/stack-shared";
import { usersCrudHandlers } from "../../users/crud";
import { SmartRequestAuth } from "@/route-handlers/smart-request";


function sessionToCrud(session: any) {
  return {
    id: session.id,
    user_id: session.projectUserId,
    created_at: session.createdAt.getTime(),
    expires_at: session.expiresAt?.getTime() ?? null,
    is_impersonation: session.isImpersonation,
  };
}

export const sessionsCrudHandlers = createLazyProxy(() => createCrudHandlers(sessionsCrud, {
  paramsSchema: yupObject({
    id: yupString().uuid().defined(),
  }),
  querySchema: yupObject({
    user_id: userIdOrMeSchema.optional(),
  }),
  onCreate: async ({ auth, data }: { auth: SmartRequestAuth, data: any, query: { user_id?: string }, params: { id: string } }) => {
    let user;
    try {
      user = await usersCrudHandlers.adminRead({
        user_id: data.user_id,
        tenancy: auth.tenancy,
      });
    } catch (e) {
      if (e instanceof CrudHandlerInvocationError && e.cause instanceof KnownErrors.UserNotFound) {
        throw new KnownErrors.UserIdDoesNotExist(data.user_id);
      }
      throw e;
    }

    const { refreshToken, accessToken } = await createAuthTokens({
      tenancy: auth.tenancy,
      projectUserId: user.id,
      expiresAt: new Date(Date.now() + data.expires_in_millis),
      isImpersonation: data.is_impersonation,
    });

    // For the CRUD handler, we need to return a session object
    // But we also need to include the tokens in the response
    const session = await prismaClient.projectUserRefreshToken.findFirst({
      where: {
        tenancyId: auth.tenancy.id,
        refreshToken,
      },
    });

    if (!session) {
      throw new StatusError(StatusError.InternalServerError, 'Failed to create session.');
    }

    // Return a session object with tokens
    const sessionData = sessionToCrud(session);

    // Store the tokens in the response but don't return them from onCreate
    // They will be added to the response by the POST handler
    (session as any).refresh_token = refreshToken;
    (session as any).access_token = accessToken;
  },
  onList: async ({ auth, query }: { auth: SmartRequestAuth, query: { user_id?: string }, params: { id: string } }) => {
    if (auth.type === 'client') {
      const currentUserId = auth.user?.id || throwErr(new KnownErrors.CannotGetOwnUserWithoutUser());
      if (query.user_id && currentUserId !== query.user_id) {
        throw new StatusError(StatusError.Forbidden, 'Client can only list sessions for their own user.');
      }
    }

    const sessions = await prismaClient.projectUserRefreshToken.findMany({
      where: {
        tenancyId: auth.tenancy.id,
        projectUserId: query.user_id || (auth.type === 'client' ? auth.user?.id : undefined),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: sessions.map(sessionToCrud),
      is_paginated: false,
    };
  },
  onDelete: async ({ auth, params }: { auth: SmartRequestAuth, params: { id: string }, query: { user_id?: string } }) => {
    // Using refreshToken as the identifier since the Prisma client hasn't been regenerated yet
    const session = await prismaClient.projectUserRefreshToken.findFirst({
      where: {
        tenancyId: auth.tenancy.id,
        refreshToken: params.id, // Using id as refreshToken temporarily
      },
    });

    if (!session) {
      throw new StatusError(StatusError.NotFound, 'Session not found.');
    }

    if (auth.type === 'client' && auth.user?.id !== session.projectUserId) {
      throw new StatusError(StatusError.Forbidden, 'Client can only delete their own sessions.');
    }

    // Using refreshToken as the identifier since the Prisma client hasn't been regenerated yet
    await prismaClient.projectUserRefreshToken.deleteMany({
      where: {
        tenancyId: auth.tenancy.id,
        refreshToken: params.id, // Using id as refreshToken temporarily
      },
    });
  },
}));
