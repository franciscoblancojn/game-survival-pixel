/// <reference types="astro/client" />

import type { StateBase } from "./state/Base";
import type { HubProps } from "./state/Hub";

declare global {
  interface Window {
    STATE: {
      hub: StateBase<HubProps>;
    };
  }
}
