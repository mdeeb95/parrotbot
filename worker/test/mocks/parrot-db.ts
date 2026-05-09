// Stub for @parrot/db. Throws on any property access so a forgotten mock
// in a unit test is a loud failure, not silent success.
export const db = new Proxy(
  {},
  {
    get() {
      throw new Error(
        "Real @parrot/db accessed in unit test — mock the caller.",
      );
    },
  },
) as unknown;

export const schema = {};
