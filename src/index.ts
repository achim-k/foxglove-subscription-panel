import { ExtensionContext } from "@foxglove/studio";

import { initSubscriptionTestPanel } from "./SubscriptionTestPanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "subscription-test-panel",
    initPanel: initSubscriptionTestPanel,
  });
}
