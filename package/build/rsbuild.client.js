"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@rsbuild/core");
const plugin_react_1 = require("@rsbuild/plugin-react");
const plugin_node_polyfill_1 = require("@rsbuild/plugin-node-polyfill");
const plugin_less_1 = require("@rsbuild/plugin-less");
exports.default = (0, core_1.defineConfig)({
    tools: {
        rspack(config) {
            config.module = config.module || {};
            config.module.rules = config.module.rules || [];
            config.module.rules.push({
                test: /\.(zip)$/,
                type: "asset/resource",
            });
            return config;
        }
    },
    plugins: [
        (0, plugin_react_1.pluginReact)(),
        (0, plugin_less_1.pluginLess)(),
        (0, plugin_node_polyfill_1.pluginNodePolyfill)()
    ],
    source: {
        entry: { index: "./demo/demo.tsx" }
    },
    html: {
        template: "./demo/demo.html"
    },
    output: {
        target: "web",
        distPath: { root: "./dist/client" },
        minify: false,
        filenameHash: false,
        sourceMap: false,
        legalComments: "none",
        copy: [
            { from: "./assets/Hiyori.zip", to: "assets/Hiyori.zip" }
        ]
    }
});
