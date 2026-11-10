import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { handleExchangeRates } from "./server/exchange-rates.ts";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "subly-exchange-rates",
      configureServer(server) {
        server.middlewares.use("/api/exchange-rates", (req, res) => {
          void handleExchangeRates(req, res);
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use("/api/exchange-rates", (req, res) => {
          void handleExchangeRates(req, res);
        });
      },
    },
  ],
});
