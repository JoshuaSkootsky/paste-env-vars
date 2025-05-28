import React from "react"
import { renderToString } from "react-dom/server"
import { expect, it } from "bun:test"
import { VarManager } from "../src/VarManager"

it("renders heading without crashing", () => {
  const html = renderToString(<VarManager />)
  expect(html).toContain("Environment Variable Editor")
})
