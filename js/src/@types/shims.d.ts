declare global {
  interface Window {
    /**
     * Global injected by https://cdn.captcha-cdn.net/captchala-loader.js once
     * the loader script finishes bootstrapping. The loader replaces the
     * `data-captchala` div in place with an interactive widget. We talk to it
     * through this global because the loader is delivered as a UMD bundle,
     * not an ES module.
     */
    captchala?: {
      /**
       * Programmatically obtain a pt_<hex> pass token for the widget mounted
       * in `target`. Resolves once the user finishes the challenge (or
       * immediately for invisible / passive flows). Rejects on user cancel
       * or transport failure.
       */
      execute?(target: HTMLElement): Promise<string>;
      /** Force-rerender a widget after mutation, e.g. after auth modal close/open. */
      reset?(target: HTMLElement): void;
    };
  }
}

export {};
