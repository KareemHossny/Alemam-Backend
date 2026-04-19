const path = require("path");

const projectRoot = path.resolve(__dirname, "../..");

const resolveFromRoot = (...segments) => require.resolve(path.join(projectRoot, ...segments));

const createCacheEntry = (modulePath, exports) => ({
  id: modulePath,
  filename: modulePath,
  loaded: true,
  exports,
});

const clearModuleCache = (modulePaths = []) => {
  modulePaths.forEach((modulePath) => {
    delete require.cache[modulePath];
  });
};

const withMockedModules = async ({ mocks = {}, clear = [] }, callback) => {
  const mockPaths = Object.keys(mocks);
  const savedEntries = new Map(
    mockPaths.map((modulePath) => [modulePath, require.cache[modulePath]])
  );

  clearModuleCache([...new Set([...clear, ...mockPaths])]);

  mockPaths.forEach((modulePath) => {
    require.cache[modulePath] = createCacheEntry(modulePath, mocks[modulePath]);
  });

  try {
    return await callback();
  } finally {
    clearModuleCache(clear);

    mockPaths.forEach((modulePath) => {
      const savedEntry = savedEntries.get(modulePath);

      if (savedEntry) {
        require.cache[modulePath] = savedEntry;
        return;
      }

      delete require.cache[modulePath];
    });
  }
};

module.exports = {
  clearModuleCache,
  resolveFromRoot,
  withMockedModules,
};

