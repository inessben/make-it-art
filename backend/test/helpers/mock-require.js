function restoreCacheEntry(resolvedPath, originalCacheEntry) {
  if (originalCacheEntry) {
    require.cache[resolvedPath] = originalCacheEntry;
    return;
  }

  delete require.cache[resolvedPath];
}

function loadModuleWithMocks(targetPath, mockedModules, { invalidate = [] } = {}) {
  const originalTarget = require.cache[targetPath];
  const originalMockedModules = new Map();
  const originalInvalidatedModules = new Map();

  delete require.cache[targetPath];

  invalidate.forEach((resolvedPath) => {
    originalInvalidatedModules.set(resolvedPath, require.cache[resolvedPath]);
    delete require.cache[resolvedPath];
  });

  Object.entries(mockedModules).forEach(([resolvedPath, exports]) => {
    originalMockedModules.set(resolvedPath, require.cache[resolvedPath]);

    require.cache[resolvedPath] = {
      id: resolvedPath,
      filename: resolvedPath,
      loaded: true,
      exports
    };
  });

  const moduleExports = require(targetPath);

  return {
    moduleExports,
    restore() {
      delete require.cache[targetPath];
      restoreCacheEntry(targetPath, originalTarget);

      originalMockedModules.forEach((originalCacheEntry, resolvedPath) => {
        restoreCacheEntry(resolvedPath, originalCacheEntry);
      });

      originalInvalidatedModules.forEach((originalCacheEntry, resolvedPath) => {
        restoreCacheEntry(resolvedPath, originalCacheEntry);
      });
    }
  };
}

module.exports = {
  loadModuleWithMocks
};
