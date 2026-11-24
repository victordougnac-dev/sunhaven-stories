interface CrazyGamesSDKWindow extends Window {
  CrazyGames?: {
    SDK?: {
      init: () => Promise<void>;
      game?: {
        loadingStart?: () => void;
        loadingStop?: () => void;
        gameplayStart?: () => void;
        gameplayStop?: () => void;
        happytime?: () => void;
      };
      data?: {
        getItem: (key: string) => string | null;
        setItem: (key: string, value: string) => void;
      };
    };
  };
}

export class CrazyGamesManager {
  private sdkAvailable = false;
  private initialized = false;
  private gameplayActive = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    const win = window as CrazyGamesSDKWindow;
    const isCrazyHost =
      typeof window !== 'undefined' &&
      (window.location.hostname.includes('crazygames') ||
        document.referrer.includes('crazygames'));

    if (isCrazyHost && !win.CrazyGames?.SDK) {
      await new Promise<void>((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.head.appendChild(s);
      });
    }

    try {
      if (win.CrazyGames?.SDK) {
        await win.CrazyGames.SDK.init();
        this.sdkAvailable = true;
        win.CrazyGames.SDK.game?.loadingStart?.();
      }
    } catch {
      this.sdkAvailable = false;
    }
  }

  loadingStop(): void {
    const win = window as CrazyGamesSDKWindow;
    try {
      if (this.sdkAvailable) {
        win.CrazyGames?.SDK?.game?.loadingStop?.();
      }
    } catch {
      // ignore offline fallback
    }
  }

  gameplayStart(): void {
    if (this.gameplayActive) return;
    this.gameplayActive = true;
    const win = window as CrazyGamesSDKWindow;
    try {
      if (this.sdkAvailable) {
        win.CrazyGames?.SDK?.game?.gameplayStart?.();
      }
    } catch {
      // ignore
    }
  }

  gameplayStop(): void {
    if (!this.gameplayActive) return;
    this.gameplayActive = false;
    const win = window as CrazyGamesSDKWindow;
    try {
      if (this.sdkAvailable) {
        win.CrazyGames?.SDK?.game?.gameplayStop?.();
      }
    } catch {
      // ignore
    }
  }

  happytime(): void {
    const win = window as CrazyGamesSDKWindow;
    try {
      if (this.sdkAvailable) {
        win.CrazyGames?.SDK?.game?.happytime?.();
      }
    } catch {
      // ignore
    }
  }

  getData(key: string): string | null {
    const win = window as CrazyGamesSDKWindow;
    try {
      if (this.sdkAvailable && win.CrazyGames?.SDK?.data) {
        return win.CrazyGames.SDK.data.getItem(key);
      }
    } catch {
      // fallback below
    }
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setData(key: string, value: string): void {
    const win = window as CrazyGamesSDKWindow;
    try {
      if (this.sdkAvailable && win.CrazyGames?.SDK?.data) {
        win.CrazyGames.SDK.data.setItem(key, value);
      }
    } catch {
      // fallback below
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore storage quota errors
    }
  }
}
