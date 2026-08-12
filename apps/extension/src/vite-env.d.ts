/// <reference types="vite/client" />

declare module '*.json' {
  const value: any;
  export default value;
}

// Chrome Extension API types
declare namespace chrome {
  namespace runtime {
    function sendMessage(message: any, responseCallback?: (response: any) => void): Promise<any>;
    function getURL(path: string): string;
    function onMessage(callback: (message: any, sender: any, sendResponse: (response: any) => void) => boolean | void): void;
    function onStartup(callback: () => void): void;
    function onInstalled(callback: () => void): void;
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
    function query(queryInfo: { active?: boolean; currentWindow?: boolean }, callback: (tabs: Tab[]) => void): void;
    function update(tabId: number, updateProperties: { url?: string }): void;
  }
  namespace storage {
    interface StorageArea {
      get(keys: string | string[] | { [key: string]: any } | null, callback?: (items: { [key: string]: any }) => void): Promise<{ [key: string]: any }>;
      set(items: { [key: string]: any }, callback?: () => void): Promise<void>;
      remove(keys: string | string[], callback?: () => void): Promise<void>;
    }
    const local: StorageArea;
  }
}

