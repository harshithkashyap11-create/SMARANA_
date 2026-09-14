import { create } from "zustand";

import {
  v1AuthLoginCreate,
  v1AuthLogoutCreate,
  v1AuthRefreshCreate,
} from "../../api/generated/smarana";
import type {
  LoginResponse,
  ProfessionalLogin,
  RoleEnum,
  UserSummary,
} from "../../api/generated/models";
import { setApiAccessToken, setApiRefreshHandler } from "../../api/client";

let refreshToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

interface AuthState {
  accessToken: string | null;
  user: UserSummary | null;
  role: RoleEnum | null;
  login: (credentials: ProfessionalLogin) => Promise<LoginResponse>;
  setSession: (session: LoginResponse) => void;
  clearSession: () => void;
  logout: () => Promise<void>;
}

function applySession(session: LoginResponse): void {
  refreshToken = session.refresh;
  setApiAccessToken(session.access);
  useAuthStore.setState({
    accessToken: session.access,
    user: session.user,
    role: session.user.role,
  });
}

function clearSession(): void {
  refreshToken = null;
  setApiAccessToken(null);
  useAuthStore.setState({ accessToken: null, user: null, role: null });
}

async function refreshAccessToken(): Promise<string | null> {
  const token = refreshToken;
  if (!token) {
    clearSession();
    return null;
  }

  refreshPromise ??= (async () => {
    try {
      const rotated = await v1AuthRefreshCreate(
        { refresh: token },
        { skipAuthRefresh: true },
      );
      if (refreshToken !== token) return null;
      refreshToken = rotated.refresh;
      setApiAccessToken(rotated.access);
      useAuthStore.setState({ accessToken: rotated.access });
      return rotated.access;
    } catch {
      if (refreshToken === token) clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const useAuthStore = create<AuthState>(() => ({
  accessToken: null,
  user: null,
  role: null,
  login: async (credentials) => {
    const session = await v1AuthLoginCreate(credentials, {
      skipAuthRefresh: true,
    });
    applySession(session);
    return session;
  },
  setSession: applySession,
  clearSession,
  logout: async () => {
    const token = refreshToken;
    const access = useAuthStore.getState().accessToken;
    clearSession();
    if (!token || !access) return;

    try {
      await v1AuthLogoutCreate(
        { refresh: token },
        {
          headers: { Authorization: `Bearer ${access}` },
          skipAuthRefresh: true,
        },
      );
    } catch {
      // Local session removal is authoritative even when server revocation is unavailable.
    }
  },
}));

setApiRefreshHandler(refreshAccessToken);
