"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@rsbuild/core");
exports.default = (0, core_1.defineConfig)({
    source: {
        entry: { index: "./demo/server.ts" }
    },
    output: {
        target: "node",
        distPath: { root: "./dist/server" },
        minify: false,
        filenameHash: false,
        sourceMap: false,
        legalComments: "none",
        filename: {
            js: "server.js"
        }
    }
});
