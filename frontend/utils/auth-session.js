function isUnauthorized(error) {
  return Number(error?.statusCode ?? error?.status) === 401;
}

export function createCurrentUserSynchronizer() {
  const pendingRequests = new WeakMap();

  return function synchronizeCurrentUser(store, request) {
    const pendingRequest = pendingRequests.get(store);
    if (pendingRequest) return pendingRequest;

    store.loading = true;

    const requestPromise = (async () => {
      try {
        let response;

        try {
          response = await request("/api/auth/me", {
            credentials: "include"
          });
        } catch (error) {
          if (!isUnauthorized(error)) throw error;

          await request("/api/auth/refresh", {
            method: "POST",
            credentials: "include"
          });
          response = await request("/api/auth/me", {
            credentials: "include"
          });
        }

        store.user = response.user;
        return store.user;
      } catch (error) {
        store.user = null;
        throw error;
      } finally {
        store.loading = false;
        store.initialized = true;
        pendingRequests.delete(store);
      }
    })();

    pendingRequests.set(store, requestPromise);
    return requestPromise;
  };
}
