export function iteratePaginatedFlowglad<S extends string, T>(
  obj: {
    [K in S]: ({ cursor }: { cursor: string | undefined }) => Promise<{
      data: T[],
      hasMore?: boolean,
      nextCursor?: string | undefined,
    }>
  },
  key: S,
) {
  return async () => {
    const data: T[] = [];
    let nextCursor: string | undefined = undefined;

    while (true) {
      const func = obj[key].bind(obj);
      const result = await func({ cursor: nextCursor });
      data.push(...result.data);
      if (!result.hasMore) {
        break;
      }
      nextCursor = result.nextCursor;
    }

    return data;
  };
}
