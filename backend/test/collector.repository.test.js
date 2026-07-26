const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const repositoryPath = require.resolve("../src/repositories/collector.repository");
const prismaPath = require.resolve("../src/lib/prisma");

test("createPersonalCollection links a verified artist collection to the artist profile", async (t) => {
  const calls = {};
  const prismaMock = {
    artist: {
      async findFirst(args) {
        calls.findArtist = args;
        return {
          id: 11
        };
      }
    },
    collection: {
      async updateMany(args) {
        calls.updateMany = args;
        return {
          count: 2
        };
      },
      async create(args) {
        calls.create = args;
        return {
          id: 44,
          ...args.data,
          items: []
        };
      }
    }
  };

  const { moduleExports: repository, restore } = loadModuleWithMocks(repositoryPath, {
    [prismaPath]: prismaMock
  });

  t.after(() => {
    restore();
  });

  const collection = await repository.createPersonalCollection({
    userId: 7,
    title: "Mimi series",
    description: "Public artist collection",
    isPrivate: false
  });

  assert.deepEqual(calls.findArtist.where, {
    userId: 7,
    verified: true
  });
  assert.equal(calls.updateMany.data.artistId, 11);
  assert.equal(calls.create.data.userId, 7);
  assert.equal(calls.create.data.artistId, 11);
  assert.equal(collection.artistId, 11);
});

test("listPersonalCollections backfills legacy artist collections before loading them", async (t) => {
  const calls = {};
  const prismaMock = {
    artist: {
      async findFirst() {
        return {
          id: 11
        };
      }
    },
    collection: {
      async updateMany(args) {
        calls.updateMany = args;
        return {
          count: 1
        };
      },
      async findFirst(args) {
        if (args.where?.isDefaultFavorites) {
          return {
            id: 99,
            userId: 7,
            isDefaultFavorites: true
          };
        }

        return null;
      },
      async findMany(args) {
        calls.findMany = args;
        return [];
      }
    },
    favorite: {
      async findMany() {
        return [];
      }
    },
    collectionItem: {
      async findFirst() {
        return null;
      },
      async create() {
        return null;
      }
    }
  };

  const { moduleExports: repository, restore } = loadModuleWithMocks(repositoryPath, {
    [prismaPath]: prismaMock
  });

  t.after(() => {
    restore();
  });

  await repository.listPersonalCollections(7);

  assert.deepEqual(calls.updateMany.where, {
    userId: 7,
    artistId: null,
    isDefaultFavorites: false
  });
  assert.equal(calls.updateMany.data.artistId, 11);
  assert.equal(calls.findMany.where.userId, 7);
});
