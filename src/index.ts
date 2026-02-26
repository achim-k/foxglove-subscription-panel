import { ExtensionContext } from "@foxglove/extension";

import { initSubscriptionTestPanel } from "./panel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "subscription-test-panel",
    initPanel: initSubscriptionTestPanel,
  });
}
