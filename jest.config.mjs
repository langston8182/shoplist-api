export default {
    testEnvironment: "node",
    testMatch: ["**/tests/**/*.test.mjs"],
    transform: {},          // pas de Babel ici, Node ESM natif
    verbose: true,
};