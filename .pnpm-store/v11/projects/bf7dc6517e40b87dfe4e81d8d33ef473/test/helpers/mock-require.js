function restoreCacheEntry(resolvedPath, originalCacheEntry) {
  if (originalCacheEntry) {
    require.cache[resolvedPath] = originalCacheEntry;
    return;
  }

  delete require.cache[resolvedPath];
}

function loadModuleWithMocks(targetPath, mockedModules) {
  const originalTarget = require.cache[targetPath];
  const originalMockedModules = new Map();

  delete require.cache[targetPath];

  Object.entries(mockedModules).forEach(([resolvedPath, exports]) => {
    originalMockedModules.set(resolvedPath, require.cache[resolvedPath]);

    require.cache[resolvedPath] = {
      id: resolvedPath,
      filename: resolvedPath,
      loaded: true,
      exports,
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
    },
  };
}

module.exports = {
  loadModuleWithMocks,
};
