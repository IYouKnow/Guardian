/// <reference types="vite/client" />

declare module '*.json' {
  const value: any;
  export default value;
}

// Chrome Extension API types (the subset this extension uses)
declare namespace chrome {
  namespace runtime {
    const id: string | undefined;
    const lastError: { message?: string } | undefined;
    function sendMessage(
      message: any,
      responseCallback?: (response: any) => void,
    ): Promise<any>;
    function getURL(path: string): string;
    const onMessage: {
      addListener(
        callback: (
          message: any,
          sender: any,
          sendResponse: (response?: any) => void,
        ) => boolean | void,
      ): void;
      removeListener(
        callback: (
          message: any,
          sender: any,
          sendResponse: (response?: any) => void,
        ) => boolean | void,
      ): void;
      hasListener?(
        callback: (
          message: any,
          sender: any,
          sendResponse: (response?: any) => void,
        ) => boolean | void,
      ): boolean;
    };
    const onStartup: { addListener(callback: () => void): void };
    const onInstalled: { addListener(callback: () => void): void };
  }
  namespace action {
    function openPopup(): void;
  }
  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      active?: boolean;
    }
    function query(
      queryInfo: { active?: boolean; currentWindow?: boolean },
      callback: (tabs: Tab[]) => void,
    ): void;
    function update(tabId: number, updateProperties: { url?: string }): void;
    function sendMessage(
      tabId?: number,
      message?: any,
      options?: any,
    ): Promise<any>;
  }
  namespace storage {
    interface StorageArea {
      get(
        keys: string | string[] | { [key: string]: any } | null,
        callback?: (items: { [key: string]: any }) => void,
      ): Promise<{ [key: string]: any }>;
      set(items: { [key: string]: any }, callback?: () => void): Promise<void>;
      remove(keys: string | string[], callback?: () => void): Promise<void>;
      clear(callback?: () => void): Promise<void>;
    }
    const local: StorageArea;
    const session: StorageArea;
    const sync: StorageArea;
  }
}
